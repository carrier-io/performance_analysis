from queue import Empty

from flask_restful import Resource


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        result = []
        for plugin in ('backend_performance', 'ui_performance'):
            try:
                tests = self.module.context.rpc_manager.call_function_with_timeout(
                    func=f'{plugin}_get_tests',
                    timeout=3,
                    project_id=project_id,
                )
                result.extend(
                    [{"test_type": plugin, **test.api_json()} for test in tests]
                )
            except Empty:
                ...
        return result
