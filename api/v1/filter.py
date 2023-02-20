from datetime import datetime
from queue import Empty
from typing import Optional

from flask_restful import Resource
from flask import request, jsonify, redirect, url_for
from collections import defaultdict

from pylon.core.tools import log

from ...utils import process_query_result, merge_comparisons, FilterManager
from ...models.pd.builder_data import ComparisonDataStruct

# from tools import MinioClient


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        # handle fetch tests with filters from analysis tab
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        start_time = request.args.get('start_time')
        if start_time:
            start_time = datetime.fromisoformat(start_time.strip('Z'))

        end_time = request.args.get('end_time')
        if end_time:
            end_time = datetime.fromisoformat(end_time.strip('Z'))

        exclude_uids = request.args.get('exclude_uids')
        if exclude_uids:
            exclude_uids = exclude_uids.split(',')

        # log.info('St %s Et %s Excl %s', start_time, end_time, exclude_uids)
        tests = []
        for plugin in ('backend_performance', 'ui_performance'):
            try:
                q_data = self.module.context.rpc_manager.call_function_with_timeout(
                    func=f'performance_analysis_test_runs_{plugin}',
                    timeout=3,
                    project_id=project.id,
                    start_time=start_time,
                    end_time=end_time,
                    exclude_uids=exclude_uids
                )
                result = process_query_result(plugin, q_data)
                tests.extend(list(map(lambda i: i.dict(), result)))
            except Empty:
                ...

        return jsonify(tests)

    def post(self, project_id: int):
        # handle click compare in analysis
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        data = dict(request.json)
        # log.info('')
        # log.info('received data %s', json.dumps(data))
        # log.info('')
        u = defaultdict(set)
        for t in data['tests']:
            u[t['group']].add((t['name'], t['test_env'],))
        data['unique_groups'] = dict()
        for k, v in u.items():
            data['unique_groups'][k] = list(v)

        if 'backend_performance' in data['unique_groups']:
            backend_only_tests = list(filter(
                lambda x: x['group'] == 'backend_performance', data['tests']
            ))
            try:
                backend_performance_builder_data = self.module.context.rpc_manager.timeout(
                    3
                ).backend_performance_compile_builder_data(project.id, backend_only_tests)
                # merge dataset data with test data
                all_backend_datasets = backend_performance_builder_data.pop('datasets')
                aggregated_requests_data = backend_performance_builder_data.pop('aggregated_requests_data')
                data['backend_performance_builder_data'] = backend_performance_builder_data
                for i in data['tests']:
                    if i['group'] == 'backend_performance':
                        datasets = all_backend_datasets.pop(i['id'], None)
                        if datasets:
                            i['datasets'] = datasets
                        requests_data = aggregated_requests_data.pop(i['build_id'], None)
                        if requests_data:
                            i['aggregated_requests_data'] = requests_data
            except Empty:
                ...

        if 'ui_performance' in data['unique_groups']:
            ui_only_tests = list(filter(
                lambda x: x['group'] == 'ui_performance', data['tests']
            ))
            try:
                ui_performance_builder_data = self.module.context.rpc_manager.timeout(
                    3
                ).ui_performance_compile_builder_data(project.id, ui_only_tests)
                # merge dataset data with test data
                all_ui_datasets = ui_performance_builder_data.pop('datasets')
                loop_earliest_dates = ui_performance_builder_data.pop('loop_earliest_dates')
                data['ui_performance_builder_data'] = ui_performance_builder_data
                for i in data['tests']:
                    if i['group'] == 'ui_performance':
                        datasets = all_ui_datasets.pop(i['id'], None)
                        if datasets:
                            i['datasets'] = datasets
                        led = loop_earliest_dates.pop(i['id'], None)
                        if led:
                            for loop_id in led.keys():
                                led[loop_id] = led[loop_id].isoformat()
                            i['loop_earliest_dates'] = led
            except Empty:
                ...

        # if we add tests to existing comparison data we do not want
        # to recalculate all comparison data. We use existing one and merge with new
        merge_source_hash: Optional[str] = request.json.get('merge_with_source')
        filter_manager = FilterManager(
            project,
            self.module.descriptor.config.get('bucket_name', 'comparison'),
        )
        if merge_source_hash:
            source_data = filter_manager.get_filters(f'{merge_source_hash}.json')
            data = merge_comparisons(source_data, data)
        else:
            # Normalize output
            data = ComparisonDataStruct.parse_obj(data)

        uploaded_file_name = filter_manager.upload_to_minio(
            data=data.json(
                exclude_none=True, exclude_defaults=True,
                by_alias=True, sort_keys=True, ensure_ascii=False
            ).encode('utf-8'),
        )
        hash_name = uploaded_file_name[:-len('.json')]

        url_base = url_for('theme.index', _external=True, _scheme=request.headers.get('X-Forwarded-Proto', 'http'))
        return redirect(f'{url_base}-/performance/analysis/compare?source={hash_name}')
