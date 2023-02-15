from datetime import datetime
from queue import Empty

from flask import request
from flask_restful import Resource
from pylon.core.tools import log

AMBER_THRESHOLD = 0.6
GREEN_THRESHOLD = 0.8
GREY_THRESHOLD = 0.5


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
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
                    end_time=end_time,
                    unique=True,
                )
                result.extend(reports)
            except Empty:
                ...
        succeeded_tests = 0
        finished_tests = 0
        all_tests = len(result)

        for report in result:
            log.info(f"{report.test_status=}")
            if report.test_status["status"].lower() == 'finished':
                finished_tests += 1
            elif report.test_status["status"].lower() == 'success':
                succeeded_tests += 1

        log.info(f"{succeeded_tests=}, {finished_tests=}, {all_tests=}")

        if (finished_tests >= all_tests * GREY_THRESHOLD) or not all_tests:
            return 'grey'

        all_tests -= finished_tests
        if (succeeded_tests / all_tests) >= GREEN_THRESHOLD:
            return 'green'
        elif (succeeded_tests / all_tests) >= AMBER_THRESHOLD:
            return 'amber'
        else:
            return 'red'
