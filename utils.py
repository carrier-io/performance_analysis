from hashlib import md5
from io import BytesIO
from typing import Iterable, Union

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


def upload_to_minio(project, data: bytes, bucket_name: str = 'comparison') -> str:
    file = BytesIO()
    file.write(data)
    file.seek(0)
    log.debug('File created')
    client = MinioClient(project=project)
    if bucket_name not in client.list_bucket():
        client.create_bucket(bucket_name)
    log.debug('Bucket created [%s]', bucket_name)
    hash_name = md5(file.getbuffer()).hexdigest()
    client.upload_file(bucket_name, file, f'{hash_name}.json')
    log.debug('File uploaded [%s.json]', hash_name)

    # todo: retention
    # from datetime import datetime, timedelta
    # date = datetime.utcnow().replace(
    #     hour=0, minute=0, second=0, microsecond=0,
    # ) + timedelta(minutes=2)
    # from minio.commonconfig import GOVERNANCE
    # from minio.retention import Retention
    # result = client.put_object(
    #     bucket_name=bucket_name,
    #     object_name="my-object",
    #     data=file,
    #     retention=Retention(GOVERNANCE, date),
    # )
    return hash_name


def merge_comparisons(source_data: dict, current_data: dict,
                      check_tests_are_unique: bool = False) -> 'ComparisonDataStruct':
    base_path = '/data/pylon/plugins/performance_analysis/tmp/'
    with open(base_path + 'source_data.tmp.json', 'w') as out:
        json.dump(source_data, out)
    with open(base_path + 'current_data.tmp.json', 'w') as out:
        json.dump(current_data, out)
    return ComparisonDataStruct.parse_obj(source_data).merge(
        ComparisonDataStruct.parse_obj(current_data),
        check_tests_are_unique
    )
