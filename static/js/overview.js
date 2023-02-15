const OverviewPage = {
    delimiters: ['[[', ']]'],
    data() {
        return {
            reports_table_params: {
                id: 'table_reports_overview',
                'data-url': `/api/v1/performance_analysis/reports/${getSelectedProjectId()}`,
                'data-height': '247',
                'data-side-pagination': true,
                'data-pagination': false,
            },
            tests_table_params: {
                'data-url': `/api/v1/performance_analysis/tests/${getSelectedProjectId()}`,
                'data-height': '247',
                id: 'table_tests_overview',
                'data-pagination': false,
                'data-unique-id': 'uid',
            }
        }
    },
    template: `
    <div class="p-3">
    <div class="card">
        <div class="card-header">
            <h3>Summary</h3>
        </div>
        <div class="card-body d-flex flex-column">
            <SummaryFilter :calculate_health="true">
                <template #cards="{master}">
                    <ColorfulCards
                        :card_data="master.colorful_cards_data"
                        :selected_aggregation_backend="master.selected_aggregation_backend"
                        :selected_aggregation_ui="master.selected_aggregation_ui"
                        :selected_metric_ui="master.selected_metric_ui"
                        :health_metric="master.health_metric"
                    ></ColorfulCards>
                </template>
            ></SummaryFilter>
        </div>
    </div>
    <div class="flex-container">
        <div class="flex-item-2">
            <TableCard
                @register="$root.register"
                instance_name="table_tests_overview"
                header='Tests'
                :table_attributes="tests_table_params"
                :show-custom-count="true"
                container_classes="my-3"
                class="table-scroll"
                :adaptive-height="true"
            >
                <template #actions="{master}">
                <div class="form-group text-right mb-0">
                    <div class="dropdown dropdown_action">
                        <button class="btn btn-secondary btn-icon btn-icon__purple mr-2"
                                role="button"
                                id="dropdownMenuActionSm"
                                data-toggle="dropdown"
                                aria-expanded="false">
                            <i class="icon__18x18 icon-create-element"></i>
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuActionSm">
                            <li class="px-3 py-1 font-weight-bold">Create Test</li>
                            <li class="dropdown-item">
                                <span class="pl-2" data-toggle="modal" data-target="#create_backend_modal_overview">
                                    Backend
                                </span>
                            </li>
                            <li class="dropdown-item">
                                <span class="pl-2" data-toggle="modal" data-target="#create_ui_modal_overview">
                                UI performance
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
                </template>
                <template #table_headers="{master}">
                    <th scope="col" data-sortable="true"
                        data-cell-style="test_formatters.name_style"
                        data-field="name"
                    >
                        Name
                    </th>
                    <th scope="col" data-sortable="true"
                        data-cell-style="test_formatters.name_style"
                        data-field="entrypoint"
                    >
                        Entrypoint
                    </th>
                    <th scope="col" data-align="center" data-sortable="true"
                        data-formatter=test_formatters.job_type
                        data-field="job_type"
                    >
                        Runner
                    </th>
                    <th scope="col" data-align="right"
                        data-cell-style="test_formatters.cell_style"
                        data-formatter=test_formatters.actions
                        data-events="test_formatters.action_events"
                    >
                        Actions
                    </th>
                </template>
            </TableCard>
        </div>
        <div class="flex-item-2">
            <TableCard
                @register="$root.register"
                instance_name="table_reports_overview"
                header='Latest reports'
                :table_attributes="reports_table_params"
                container_classes="my-3"
                :show-custom-count="true"
                class="table-scroll"
                :adaptive-height="true"
            >
                <template #actions="{master}">
                <div class="form-group text-right mb-0">
                    <button type="button" class="btn btn-secondary btn-icon btn-icon__purple mr-2" 
                        @click="master.table_action('refresh')">
                    <i class="fas fa-sync"></i>
                </button>
                </div>
                </template>
                <template #table_headers="{master}">
                    <th scope="col" data-checkbox="true"></th>
                    <th data-visible="false" data-field="id">index</th>
                    <th scope="col" data-sortable="true" data-field="name"
                        data-formatter="report_formatters.name"
                    >
                        Name
                    </th>
                    <th scope="col" data-sortable="true" data-field="start_time"
                        data-formatter="report_formatters.start"
                    >
                        Start
                    </th>
                    <th scope="col" 
                        data-sortable="true" 
                        data-align="center" 
                        data-field="test_config.job_type"
                        data-formatter="report_formatters.job_type"
                    >
                        Runner
                    </th>
                    <th scope="col" data-sortable="true" data-field="test_status"
                        data-align="right"
                        data-formatter="report_formatters.full_status"
                    >
                        Status
                    </th>
                </template>
            </TableCard>
        </div>
    </div>
</div>
    `
}
register_component("OverviewPage", OverviewPage)