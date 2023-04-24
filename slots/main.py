from pylon.core.tools import web, log
from tools import auth


class Slot:
    @web.slot('performance_analysis_content')
    @auth.decorators.check_slot({
        "permissions": ["performance.analysis"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def content(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'main/content.html',
            )

    @web.slot('performance_analysis_scripts')
    def scripts(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'main/scripts.html',
            )

    @web.slot('performance_analysis_styles')
    def styles(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'main/styles.html',
            )
