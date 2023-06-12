from datetime import datetime

from pydantic import BaseModel, validator
from typing import Optional, List


class AnalysisAggregations(BaseModel):
    min: float
    max: float
    mean: float
    pct50: float
    pct75: float
    pct90: float
    pct95: float
    pct99: float


class BaseAnalysisModel(BaseModel):
    id: int
    uid: str
    group: str
    name: str
    start_time: datetime
    test_type: str
    test_env: str
    status: str
    duration: int
    tags: Optional[List[dict]] = []
    s3_settings: dict

    @validator('s3_settings', always=True, pre=True, check_fields=False)
    def compute_s3_settings(cls, value: float, values: dict) -> float:
        return value.get('integrations', {}).get('system', {}).get('s3_integration', {})
