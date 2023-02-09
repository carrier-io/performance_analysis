from pylon.core.tools import web, log
from sqlalchemy.util.queue import Empty


class Slot:
    @web.slot('performance_analysis_overview_content')
    def content(self, context, slot, payload):
        project_id = context.rpc_manager.call.project_get_id()
        public_regions = context.rpc_manager.call.get_rabbit_queues("carrier")
        try:
            public_regions.remove("__internal")
        except:
            pass
        project_regions = context.rpc_manager.call.get_rabbit_queues(
            f"project_{project_id}_vhost")
        try:
            cloud_regions = context.rpc_manager.timeout(3).integrations_get_cloud_integrations(
                project_id)
        except Empty:
            cloud_regions = []
        try:
            from ...backend_performance.constants import (
                JMETER_MAPPING,
                GATLING_MAPPING,
                EXECUTABLE_MAPPING
            )
            runners = {
                'jMeter': list(map(lambda i: {'version': i}, JMETER_MAPPING.keys())),
                'Gatling': list(map(lambda i: {'version': i}, GATLING_MAPPING.keys())),
                'Executable JAR (BETA)': list(
                    map(lambda i: {'version': i}, EXECUTABLE_MAPPING.keys()))
            }
        except ImportError:
            runners = {
                'jMeter': [],
                'Gatling': [],
                'Executable JAR (BETA)': []
            }

        try:
            from ...ui_performance.constants import RUNNER_MAPPING
            ui_runners = list(RUNNER_MAPPING.keys())
        except ImportError:
            ui_runners = []

        with context.app.app_context():
            return self.descriptor.render_template(
                'overview/content.html',
                runners=runners,
                ui_runners=ui_runners,
                locations={
                    'public_regions': public_regions,
                    'project_regions': project_regions,
                    "cloud_regions": cloud_regions
                }
            )

    @web.slot('performance_analysis_overview_scripts')
    def scripts(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'overview/scripts.html',
            )

    @web.slot('performance_analysis_overview_styles')
    def styles(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'overview/styles.html',
            )
