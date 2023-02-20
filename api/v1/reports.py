from datetime import datetime
from queue import Empty
from pylon.core.tools import log
from flask_restful import Resource
from flask import request


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        # log.info(f"{request.args=}")
        result = []

        if start_time := request.args.get('start_time'):
            start_time = datetime.fromisoformat(start_time.strip('Z'))

        if end_time := request.args.get('end_time'):
            end_time = datetime.fromisoformat(end_time.strip('Z'))

        for plugin in ('backend_performance', 'ui_performance'):
            try:
                reports = self.module.context.rpc_manager.call_function_with_timeout(
                    func=f'{plugin}_get_reports',
                    timeout=3,
                    project_id=project_id,
                    start_time=start_time,
                    end_time=end_time
                )
                result.extend(
                    [{"report_type": plugin, **report.to_json()} for report in reports]
                )
            except Empty:
                ...
        # result = [report for report in result]  # wtf?
        return result
