import json
from typing import Tuple

from flask import request, g
from flask_restful import Resource

from pylon.core.tools import log

from ...utils import FilterManager


class API(Resource):
    url_params = [
        '<int:project_id>/<string:comparison_hash>',
    ]

    def __init__(self, module):
        self.module = module

    def put(self, project_id: int, comparison_hash: str) -> Tuple[None, int]:
        # update current filters for user
        user_id = g.auth.id
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        bucket_name = self.module.descriptor.config.get('bucket_name', 'comparison')
        filter_manager = FilterManager(
            project,
            bucket_name,
            source_hash=comparison_hash
        )
        current_filters = filter_manager.get_user_filters(user_id)

        id_filter_lambda = lambda i: i['id']
        # uncomment this if need to save multiple filters
        # new_filters = list(request.json)
        # new_filter_ids = set(map(id_filter_lambda, new_filters))
        #
        # final_filters = list(filter(lambda i: i['id'] not in new_filter_ids, current_filters))
        # final_filters.extend(new_filters)
        new_filter = dict(request.json)
        # new_filter['saved'] = True
        final_filters = [i for i in current_filters if i['id'] != new_filter['id']]
        final_filters.append(new_filter)
        final_filters.sort(key=id_filter_lambda)
        # log.info('final_filters %s', final_filters)

        # upload_to_minio(
        #     project,
        #     data=json.dumps(final_filters, ensure_ascii=False).encode('utf-8'),
        #     file_name=get_persistent_filters_file_name(comparison_hash, user_id),
        #     bucket_name=bucket_name
        # )
        filter_manager.upload_to_minio(
            data=json.dumps(final_filters, ensure_ascii=False).encode('utf-8'),
            file_name=filter_manager.get_user_filters_name(user_id)
        )
        return None, 204
