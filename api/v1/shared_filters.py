import json
from uuid import uuid4

from flask import request, url_for, redirect
from flask_restful import Resource


from ...utils import FilterManager

from tools import auth


class API(Resource):
    url_params = [
        '<int:project_id>/<string:comparison_hash>',
    ]

    def __init__(self, module):
        self.module = module

    def post(self, project_id: int, comparison_hash: str):
        # create shareable filter file
        # user_id = g.auth.id
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        bucket_name = self.module.descriptor.config.get('bucket_name', 'comparison')
        filter_manager = FilterManager(
            project,
            bucket_name,
            source_hash=comparison_hash
        )
        filters = list(request.json)

        share_uid = str(uuid4())
        filter_manager.upload_to_minio(
            data=json.dumps(filters, ensure_ascii=False).encode('utf-8'),
            file_name=filter_manager.get_shared_filters_name(share_uid)
        )

        url_base = url_for('theme.index', _external=True, _scheme=request.headers.get('X-Forwarded-Proto', 'http'))
        return redirect(f'{url_base}-/performance/analysis/compare?source={comparison_hash}&share={share_uid}')

    def put(self, project_id: int, comparison_hash: str):
        # handle change shared filters
        # window.socket.on('performance_analysis_{comparison_hash}_{share_uid}', async payload = > {
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        bucket_name = self.module.descriptor.config.get('bucket_name', 'comparison')
        share_uid = request.json['uid']
        filter_data = [request.json['filter_data']]
        filter_manager = FilterManager(
            project,
            bucket_name,
            source_hash=comparison_hash
        )
        current_filters = filter_manager.get_shared_filters(share_uid)
        final_filters = filter_manager.merge_filter_sets(current_filters, filter_data)
        filter_manager.upload_to_minio(
            data=json.dumps(final_filters, ensure_ascii=False).encode('utf-8'),
            file_name=filter_manager.get_shared_filters_name(share_uid)
        )

        payload = {
            # 'timestamp': datetime.utcnow().timestamp(),
            'data': final_filters,
            'user': auth.current_user(),
            # 'new_item': request.json['filter_data']
        }

        self.module.context.sio.emit(f'performance_analysis_{comparison_hash}_{share_uid}', payload)
        return payload, 200
