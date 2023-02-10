from collections import Counter
from datetime import datetime, timezone
from typing import Optional, Dict, List

from pydantic import BaseModel, validator


def ensure_sorted(cls, value: list):
    value.sort()
    return value


class BuilderDataBase(BaseModel):
    actions: list = []
    earliest_date: datetime = datetime.now(timezone.utc)

    @validator('earliest_date')
    def ensure_tz(cls, value: datetime):
        if value.tzinfo:
            return value.astimezone(timezone.utc)
        return value.replace(tzinfo=timezone.utc)

    _ensure_sorted = validator('actions', allow_reuse=True)(ensure_sorted)

    def merge(self, target: 'BuilderDataBase'):
        return self.__class__.parse_obj({
            self.__fields__.get('actions').alias: list({
                *self.actions,
                *target.actions
            }),
            'earliest_date': min(
                self.earliest_date,
                target.earliest_date
            )
        })


class BuilderDataUI(BuilderDataBase):
    class Config:
        fields = {
            'actions': 'page_names',
        }


class BuilderDataBackend(BuilderDataBase):
    class Config:
        fields = {
            'actions': 'all_requests',
        }


class ComparisonDataStruct(BaseModel):
    tests: list
    unique_groups: Dict[str, List[list]]
    ui_performance_builder_data: Optional[BuilderDataUI] = BuilderDataUI()
    backend_performance_builder_data: Optional[BuilderDataBackend] = BuilderDataBackend()

    @validator('tests', allow_reuse=True)
    def _ensure_sorted_tests(cls, value: list):
        value.sort(key=lambda x: x['uid'])
        return value

    @validator('unique_groups', allow_reuse=True)
    def _ensure_sorted_groups(cls, value: dict):
        for group in value:
            ensure_sorted(cls, value[group])
        return value

    def __get_merged_tests(self, target: 'ComparisonDataStruct', check_tests_are_unique: bool) -> list:
        if check_tests_are_unique:
            duplicates = Counter({
                k: v
                for k, v in Counter(map(lambda x: x['uid'], self.tests + target.tests)).items()
                if v > 1
            })
            return [*self.tests, *filter(lambda x: x['uid'] not in duplicates, target.tests)]
        return [*self.tests, *target.tests]

    def __get_merged_unique_groups(self, target: 'ComparisonDataStruct') -> dict:
        united_unique_groups = target.unique_groups
        for k, v in self.unique_groups.items():
            if k in target.unique_groups:
                united_unique_groups[k] = [*v, *filter(lambda x: x not in v, target.unique_groups[k])]
            else:
                united_unique_groups[k] = v
        return united_unique_groups

    def __get_merged_ui_data(self, target: 'ComparisonDataStruct') -> BuilderDataUI:
        return self.ui_performance_builder_data.merge(target.ui_performance_builder_data)

    def __get_merged_backend_data(self, target: 'ComparisonDataStruct') -> BuilderDataBackend:
        return self.backend_performance_builder_data.merge(target.backend_performance_builder_data)

    def merge(self, target: 'ComparisonDataStruct', check_tests_are_unique: bool = False) -> 'ComparisonDataStruct':
        return self.__class__(
            tests=self.__get_merged_tests(target, check_tests_are_unique),
            unique_groups=self.__get_merged_unique_groups(target),
            ui_performance_builder_data=self.__get_merged_ui_data(target),
            backend_performance_builder_data=self.__get_merged_backend_data(target)
        )
