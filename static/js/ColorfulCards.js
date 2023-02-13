const ColorfulCards = {
    delimiters: ['[[', ']]'],
    props: ['card_data', 'selected_aggregation_backend', 'selected_aggregation_ui', 'selected_metric_ui'],
    methods: {
        compute_average(key) {
            return (this.card_data.sums[key] / this.card_data.counters[key]).toFixed(2)
        }
    },
    computed: {
        backend_metric_name() {
            return get_mapped_name(this.selected_aggregation_backend)
        },
        ui_metric_name() {
            return get_mapped_name(this.selected_aggregation_ui)
        },
        ui_aggregation_name() {
            return get_mapped_name(this.selected_metric_ui)
        }
    },
    template: `
    <div class="d-grid grid-column-5 gap-3 mt-3 colorful-cards">
        <div class="card card-sm card-health card-health__green">
            <div class="card-header">
                <i class="icon-health icon-health__green"></i>
            </div>
            <div class="card-body">HEALTH</div>
        </div>
        <div class="card card-sm card-blue">
            <div class="card-header">
                <span v-if="card_data?.sums.throughput !== undefined">
                    [[ compute_average('throughput') ]] req/sec
                </span>
                <span v-else>-</span>
            </div>
            <div class="card-body">AVR. THROUGHPUT</div>
        </div>
        <div class="card card-sm card-red">
            <div class="card-header">
                <span v-if="card_data?.sums.error_rate !== undefined">
                    [[ compute_average('error_rate') ]]%
                </span>
                <span v-else>-</span>
            </div>
            <div class="card-body">ERROR RATE</div>
        </div>
        <div class="card card-sm card-azure">
            <div class="card-header">
                <span v-if="card_data?.sums.aggregation_backend !== undefined">
                    [[ compute_average('aggregation_backend') ]] ms
                </span>
                <span v-else>-</span>
            </div>
            
            <div class="card-body">
                <span v-if="card_data?.sums.aggregation_backend !== undefined">
                    [[ backend_metric_name ]]
                </span>
                <span v-else>-</span>
            </div>
        </div>
        <div class="card card-sm card-magento">
            <div class="card-header">
                <span v-if="card_data?.sums.response_time !== undefined">
                    [[ compute_average('response_time') ]] ms
                </span>
                <span v-else>-</span>
            </div>
            <div class="card-body">AVR. RESPONSE TIME</div>
        </div>
        <div class="card card-sm card-orange">
            <div class="card-header">
                <span v-if="card_data?.sums.aggregation_ui !== undefined">
                    [[ compute_average('aggregation_ui') ]] ms
                </span>
                <span v-else>-</span>
            </div>
            <div class="card-body">
                [[ ui_metric_name || '-' ]]
            </div>
        </div>
    </div>
    `
}


register_component('ColorfulCards', ColorfulCards)