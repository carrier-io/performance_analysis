import json
from collections import defaultdict
from queue import Empty
from typing import Optional

from pylon.core.tools import web, log

from tools import MinioClient, session_project

from ..utils import process_query_result, FilterManager


class Slot:
    @web.slot('performance_analysis_compare_content')
    def content(self, context, slot, payload):
        user_id = payload.auth.id
        project = context.rpc_manager.call.project_get_or_404(project_id=session_project.get())
        filter_manager = FilterManager(
            project,
            self.descriptor.config.get('bucket_name', 'comparison'),
            payload.request.args.get('source')
        )
        comparison_data = filter_manager.get_minio_file_data_or_none(f'{filter_manager.source_hash}.json')
        if not comparison_data:
            with context.app.app_context():
                return self.descriptor.render_template(
                    'compare/empty.html',
                    file_hash=filter_manager.source_hash
                )
        else:
            comparison_data = json.loads(comparison_data)

        baselines = defaultdict(dict)

        def search_json_for_baselines(rep_id: int):
            for test in tuple(comparison_data['tests']):
                if test['id'] == rep_id:
                    return test

        ids_to_query = defaultdict(set)
        rpc_suffix = '_get_baseline_report_id'
        for group, values in comparison_data.get('unique_groups', {}).items():
            for name, env in values:
                try:
                    report_id = context.rpc_manager.call_function_with_timeout(
                        func=f'{group}{rpc_suffix}',
                        timeout=3,
                        project_id=project.id,
                        test_name=name,
                        test_env=env
                    )
                    if report_id:
                        baseline_test = search_json_for_baselines(report_id)
                        if not baseline_test:
                            # log.info('Baseline test [%s] is not in selection. Need to query from db.', report_id)
                            ids_to_query[group].add(report_id)
                        else:
                            baselines[group][name] = {
                                env: baseline_test
                            }
                except Empty:
                    ...

        results_rpc_suffix = '_get_results_by_ids'
        for group, ids in ids_to_query.items():
            # log.info('querying results for %s ids [%s]', group, ids)
            reports_data = context.rpc_manager.call_function_with_timeout(
                func=f'{group}{results_rpc_suffix}',
                timeout=3,
                project_id=project.id,
                report_ids=ids,
            )
            for report in process_query_result(group, reports_data):
                baselines[group][report.name] = {
                    report.test_env: report.dict(exclude={'total', 'failures'})
                }

        user_filters = []
        shared_filters = []
        shared_filter_uid = payload.request.args.get('share')
        if shared_filter_uid:
            shared_filters = filter_manager.get_shared_filters(shared_filter_uid)
        else:
            user_filters = filter_manager.get_user_filters(user_id)

        with context.app.app_context():
            return self.descriptor.render_template(
                'compare/content.html',
                comparison_data=comparison_data,
                file_hash=filter_manager.source_hash,
                baselines=baselines,
                user_filters=user_filters,
                shared_filters=shared_filters,
                request=payload.request
            )

    @web.slot('performance_analysis_compare_scripts')
    def scripts(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'compare/scripts.html',
            )

    @web.slot('performance_analysis_compare_styles')
    def styles(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'compare/styles.html',
            )
