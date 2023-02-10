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


def upload_to_minio(project, data: bytes,
                    file_name: Optional[str] = None,
                    bucket_name: str = 'comparison'
                    ):
    file = BytesIO()
    file.write(data)
    file.seek(0)
    # log.debug('File created')
    client = MinioClient(project=project)
    if bucket_name not in client.list_bucket():
        client.create_bucket(bucket_name)
        client.configure_bucket_lifecycle(bucket_name, days=7)
    if not file_name:
        file_name = f'{md5(file.getbuffer()).hexdigest()}.json'
    # log.debug('Bucket created [%s]', bucket_name)
    client.upload_file(bucket_name, file, file_name)
    return file_name


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


def get_minio_file_data_or_none(project, bucket_name: str, file_name: str) -> Optional[str]:
    # if not file_name:
    #     return
    # log.info('get start %s', [bucket_name, file_name])
    try:
        file_data = MinioClient(project).download_file(bucket_name, file_name)
    except Exception as e:
        # log.info('get_minio_file_data_or_none %s', e)
        return
    return file_data.decode('utf-8')


def get_persistent_filters_file_name(source_hash: str, user_id: int) -> str:
    return f'{source_hash}_user_filters_{user_id}.json'


def get_persistent_filters(project, bucket_name: str, source_hash: str, user_id: int) -> List[dict]:
    file_name = get_persistent_filters_file_name(source_hash, user_id)
    filters = get_minio_file_data_or_none(project, bucket_name=bucket_name, file_name=file_name)
    if not filters:
        return []
    return json.loads(filters)
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
