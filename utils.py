from hashlib import md5
from io import BytesIO
from typing import Iterable, Union, Optional, List

import json

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


# def upload_to_minio(project, data: bytes,
#                     file_name: Optional[str] = None,
#                     bucket_name: str = 'comparison'
#                     ):
#     file = BytesIO()
#     file.write(data)
#     file.seek(0)
#     # log.debug('File created')
#     client = MinioClient(project=project)
#     if bucket_name not in client.list_bucket():
#         client.create_bucket(bucket_name)
#         client.configure_bucket_lifecycle(bucket_name, days=7)
#     if not file_name:
#         file_name = f'{md5(file.getbuffer()).hexdigest()}.json'
#     # log.debug('Bucket created [%s]', bucket_name)
#     client.upload_file(bucket_name, file, file_name)
#     return file_name


def merge_comparisons(source_data: dict, current_data: dict,
                      check_tests_are_unique: bool = False) -> 'ComparisonDataStruct':
    # base_path = '/data/pylon/plugins/performance_analysis/tmp/'
    # with open(base_path + 'source_data.tmp.json', 'w') as out:
    #     json.dump(source_data, out)
    # with open(base_path + 'current_data.tmp.json', 'w') as out:
    #     json.dump(current_data, out)
    return ComparisonDataStruct.parse_obj(source_data).merge(
        ComparisonDataStruct.parse_obj(current_data),
        check_tests_are_unique
    )


# def get_minio_file_data_or_none(project, bucket_name: str, file_name: str) -> Optional[str]:
#     # if not file_name:
#     #     return
#     # log.info('get start %s', [bucket_name, file_name])
#     try:
#         file_data = MinioClient(project).download_file(bucket_name, file_name)
#     except Exception as e:
#         # log.info('get_minio_file_data_or_none %s', e)
#         return
#     return file_data.decode('utf-8')


# def get_persistent_filters_file_name(source_hash: str, user_id: int) -> str:
#     return f'{source_hash}_user_filters_{user_id}.json'


# def get_filters(project, bucket_name: str, filter_file_name: str) -> List[dict]:
#     filters = get_minio_file_data_or_none(project, bucket_name=bucket_name, file_name=filter_file_name)
#     if not filters:
#         return []
#     return json.loads(filters)
    # return [{
    #     "id": 1675947643488,
    #     "type": "ui_performance",
    #     "initial_actions": [
    #         "login"
    #     ],
    #     "initial_metrics": [
    #         "lvc"
    #     ]
    # }]

# def get_persistent_filters(project, bucket_name: str, source_hash: str, user_id: int) -> List[dict]:
#     file_name = get_persistent_filters_file_name(source_hash, user_id)
#     return get_filters(project, bucket_name, )

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
        if not self._source_hash:
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

    def upload_to_minio(self, data: bytes, file_name: Optional[str] = None) -> str:
        file = BytesIO()
        file.write(data)
        file.seek(0)
        if not file_name:
            file_name = f'{md5(file.getbuffer()).hexdigest()}.json'
        self.client.upload_file(self.bucket_name, file, file_name)
        return file_name
