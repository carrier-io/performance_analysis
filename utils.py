from hashlib import md5
from io import BytesIO
from typing import Iterable, Union, Optional, List

import json
from uuid import uuid4

from .models.pd.builder_data import ComparisonDataStruct
from .models.pd.backend_performance import BackendAnalysisModel
from .models.pd.ui_performance import UIAnalysisModel

from pylon.core.tools import log

from tools import MinioClient, api_tools


def process_query_result(plugin, query_data) -> Iterable[Union[BackendAnalysisModel, UIAnalysisModel]]:
    serializers_map = {
        'backend_performance': BackendAnalysisModel,
        'ui_performance': UIAnalysisModel
    }
    model = serializers_map[plugin]
    return (
        model.parse_obj(i)
        for i in query_data
    )


def merge_comparisons(source_data: dict, current_data: dict,
                      check_tests_are_unique: bool = False) -> 'ComparisonDataStruct':
    return ComparisonDataStruct.parse_obj(source_data).merge(
        ComparisonDataStruct.parse_obj(current_data),
        check_tests_are_unique
    )


class FilterManager:
    RETENTION_DAYS: int = 7

    def __init__(self, project, bucket_name: str, source_hash: Optional[str] = None):
        self.project = project
        self.bucket_name = bucket_name
        self._source_hash = source_hash
        self._client = None
        self.create_bucket()

    @property
    def source_hash(self) -> Optional[str]:
        if self._source_hash is None:
            raise NotImplementedError('Variable source_hash in None')
        return self._source_hash

    @source_hash.setter
    def source_hash(self, value: str):
        self._source_hash = value

    @property
    def client(self):
        if not self._client:
            self._client = MinioClient(self.project)
        return self._client

    def create_bucket(self) -> None:
        if self.bucket_name not in self.client.list_bucket():
            self.client.create_bucket(self.bucket_name)
            self.client.configure_bucket_lifecycle(self.bucket_name, days=self.RETENTION_DAYS)

    def get_minio_file_data_or_none(self, file_name: str) -> Optional[str]:
        try:
            file_data = self.client.download_file(self.bucket_name, file_name)
        except Exception as e:
            # log.info('get_minio_file_data_or_none %s', e)
            return
        return file_data.decode('utf-8')

    def get_filters(self, filter_file_name: str, default=[]):
        filters = self.get_minio_file_data_or_none(filter_file_name)
        try:
            return json.loads(filters)
        except TypeError:
            return default

    def get_user_filters_name(self, user_id: int) -> str:
        return f'{self.source_hash}_user_filters_{user_id}.json'

    def get_user_filters(self, user_id: int) -> List[dict]:
        file_name = self.get_user_filters_name(user_id)
        return self.get_filters(file_name, default=[])

    def get_shared_filters_name(self, uid: Optional[str] = None) -> str:
        if uid is None:
            uid = str(uuid4())
        return f'{self.source_hash}_shared_filter_{uid}.json'

    def get_shared_filters(self, share_uid: str) -> List[dict]:
        file_name = self.get_shared_filters_name(share_uid)
        return self.get_filters(file_name, default=[])

    def upload_to_minio(self, data: bytes, file_name: Optional[str] = None) -> str:
        file = BytesIO()
        file.write(data)
        file.seek(0)
        if not file_name:
            file_name = f'{md5(file.getbuffer()).hexdigest()}.json'
        self.client.upload_file(self.bucket_name, file, file_name)
        return file_name

    @staticmethod
    def merge_filter_sets(set_1: list, set_2: list) -> list:
        id_filter_lambda = lambda i: i['id']
        new_filter_ids = set(map(id_filter_lambda, set_2))

        final_filters = list(filter(lambda i: i['id'] not in new_filter_ids, set_1))
        final_filters.extend(set_2)
        final_filters.sort(key=id_filter_lambda)
        return final_filters
