<script setup>
import { ref, onMounted, watch } from "vue";
import * as echarts from "echarts";
import WelcomeItem from "./WelcomeItem.vue";
import { useTransition } from "@vueuse/core";

const props = defineProps({
  receivedMessage: Object,
  history: Array,
});
const selectedResponseTimes = ref([
  "Median Response Time",
  "95th Percentile Response Time",
]);
const unSetSelect = ref([]);
const error_rate = ref(0);
const outputErrorRate = useTransition(error_rate, { duration: 1000 });
const rps = ref(0);
const outputRPS = useTransition(rps, { duration: 1000 });
const total_requests = ref(0);
const outputTotalRequests = useTransition(total_requests, { duration: 1000 });

const chartRPS = ref(null);
const chartResponseTime = ref(null);
const rpsData = ref([]);
const medianData = ref([]);
const ninetyFifthData = ref([]);

const legendSelectedRPS = {
  rps: true,
};

let rpsChart;
let responseTimeChart;

const updateRPSChart = () => {
  if (rpsChart) {
    const series = [
      {
        name: "RPS",
        type: "line",
        data: rpsData.value.map((data) => [data.timestamp, data.value]),
      },
    ];

    // 添加api_results 的 RPS 数据系列
    props.receivedMessage.api_results.forEach((apiResult) => {
      series.push({
        name: `${apiResult.name} RPS`,
        type: "line",
        data: rpsData.value
          .map((data) => {
            return { value: apiResult.rps, timestamp: data.timestamp };
          })
          .map((data) => [data.timestamp, data.value]),
        showInLegend: true,
      });
    });
    props.receivedMessage.api_results.forEach((apiResult) => {
      legendSelectedRPS[`${apiResult.name} RPS`] = false; // 初始不选中
    });
    rpsChart.setOption({
      xAxis: {
        data: rpsData.value.map((data) => data.timestamp),
      },
      legend: { data: series.map((s) => s.name), selected: legendSelectedRPS },
      series: series,
    });
  }
};

const updateResponseTimeChart = (str) => {
  if (responseTimeChart) {
    const series = [
      {
        name: "Median Response Time",
        type: "line",
        data: medianData.value.map((data) => data.value),
        showInLegend: true,
        itemStyle: {
          normal: {
            opacity: selectedResponseTimes.value.includes(
              "Median Response Time"
            )
              ? 1
              : 0,
          },
        },
        lineStyle: {
          opacity: selectedResponseTimes.value.includes("Median Response Time")
            ? 1
            : 0,
        },
      },
      {
        name: "95th Percentile Response Time",
        type: "line",
        data: ninetyFifthData.value.map((data) => data.value),
        showInLegend: true,
        itemStyle: {
          normal: {
            opacity: selectedResponseTimes.value.includes(
              "95th Percentile Response Time"
            )
              ? 1
              : 0,
          },
        },
        lineStyle: {
          opacity: selectedResponseTimes.value.includes(
            "95th Percentile Response Time"
          )
            ? 1
            : 0,
        },
      },
    ];
    console.log("str", str);
    props.receivedMessage.api_results.forEach((apiResult) => {
      series.push(
        {
          name: `${apiResult.name} Median Response Time`,
          type: "line",
          data: medianData.value.map((data) => [
            data.timestamp,
            apiResult.median_response_time,
          ]),
          showInLegend: true,
          itemStyle: {
            normal: {
              opacity: selectedResponseTimes.value.includes(
                `${apiResult.name} Median Response Time`
              )
                ? 1
                : 0,
            },
          },
          lineStyle: {
            opacity: selectedResponseTimes.value.includes(
              `${apiResult.name} Median Response Time`
            )
              ? 1
              : 0,
          },
        },
        {
          name: `${apiResult.name} 95th Percentile Response Time`,
          type: "line",
          data: ninetyFifthData.value.map((data) => [
            data.timestamp,
            apiResult.response_time_95,
          ]),
          showInLegend: true,
          itemStyle: {
            normal: {
              opacity: selectedResponseTimes.value.includes(
                `${apiResult.name} 95th Percentile Response Time`
              )
                ? 1
                : 0,
            },
          },
          lineStyle: {
            opacity: selectedResponseTimes.value.includes(
              `${apiResult.name} 95th Percentile Response Time`
            )
              ? 1
              : 0,
          },
        }
      );
    });
    console.log("series", series);

    responseTimeChart.setOption({
      xAxis: {
        data: medianData.value.map((data) => data.timestamp),
      },
      series: series,
    });
  }
};

onMounted(() => {
  rpsChart = echarts.init(chartRPS.value);
  responseTimeChart = echarts.init(chartResponseTime.value);

  rpsChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["RPS"] },
    xAxis: { type: "category", boundaryGap: false, data: [] },
    yAxis: { type: "value" },
    series: [{ name: "RPS", type: "line", data: [] }],
  });

  responseTimeChart.setOption({
    tooltip: { trigger: "axis" },

    xAxis: { type: "category", boundaryGap: false, data: [] },
    yAxis: { type: "value" },
    series: [
      { name: "Median Response Time", type: "line", data: [] },
      { name: "95th Percentile Response Time", type: "line", data: [] },
    ],
  });
  console.log("chart history", props.history)
  if (props.history.length > 0){
    console.log(props.history)
    // todo: 更新charts
  }
});

watch(
  () => props.receivedMessage,
  (newVal) => {
    if (newVal) {
      const newTimestamp = new Date(newVal.timestamp).toLocaleTimeString();
      rpsData.value.push({ timestamp: newTimestamp, value: newVal.rps });

      console.log("newVal", newVal.api_results);
      // if (rpsData.value.length > 20) rpsData.value.shift();
      updateRPSChart();
      error_rate.value = newVal.error_rate;
      rps.value = newVal.rps;
      total_requests.value = newVal.total_requests;
      medianData.value.push({
        timestamp: newTimestamp,
        value: newVal.median_response_time,
      });
      ninetyFifthData.value.push({
        timestamp: newTimestamp,
        value: newVal.response_time_95,
      });

      if (unSetSelect.value.length === 0) {
        newVal.api_results.forEach((apiResult) => {
          unSetSelect.value.push(
            {
              name: `${apiResult.name} Median Response Time`,
              label: `${apiResult.name} Median Response Time`,
            },
            {
              name: `${apiResult.name} 95th Percentile Response Time`,
              label: `${apiResult.name} 95th Percentile Response Time`,
            }
          );
        });
      }

      console.log("unSetSelect", unSetSelect.value);
      // if (medianData.value.length > 20) medianData.value.shift();
      // if (ninetyFifthData.value.length > 20) ninetyFifthData.value.shift();
      updateResponseTimeChart();
    }
  },
  { deep: true }
);
// 监听selectedResponseTimes的变化
watch(
  selectedResponseTimes,
  () => {
    // 当选中的响应时间变化时，更新响应时间图表
    updateResponseTimeChart("selectChange");
  },
  {
    deep: true, // 深度监听，以便于捕获数组内部值的变化
  }
);
</script>

<template>
  <WelcomeItem>
    <!-- <template #heading>错误率 </template> -->
    <div
      style="
        width: 200px;
        height: 14rem;
        display: flex;
        flex-direction: column; /* 子元素垂直排列 */
        align-items: center; /* 水平居中 */
        text-align: center;
        padding-top: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
      "
    >
      <el-statistic title="RPS" :precision="2" :value="outputRPS" />
      <el-statistic
        title="错误率"
        :value="outputErrorRate"
        :precision="2"
        class="flex-item"
      >
        <template #suffix>
          <span>%</span>
        </template>
      </el-statistic>
      <el-statistic
        title="总请求数据量"
        :value="outputTotalRequests"
        class="flex-item"
      />
    </div>
  </WelcomeItem>
  <WelcomeItem>
    <template #heading>RPS</template>
    <div ref="chartRPS" style="width: 600px; height: 265px"></div>
  </WelcomeItem>
  <WelcomeItem>
    <template #heading>响应时间 </template>
    <div
      style="
        width: 55%;
        float: left;
        margin-left: 20%;
        position: absolute;
        z-index: 99;
      "
    >
      <el-select
        v-model="selectedResponseTimes"
        multiple
        size="small"
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        placeholder="请选择"
      >
        <el-option
          label="中位响应时间"
          value="Median Response Time"
        ></el-option>
        <el-option
          label="95百分位响应时间"
          value="95th Percentile Response Time"
        ></el-option>
        <!-- 动态添加其他响应时间系列选项 -->

        <el-option
          v-for="option in unSetSelect"
          :key="option.name"
          :label="option.label"
          :value="option.name"
        >
        </el-option>
      </el-select>
    </div>
    <div ref="chartResponseTime" style="width: 600px; height: 265px"></div>
  </WelcomeItem>
</template>
<style scoped>
.flex-row {
  display: flex;
  width: 100%; /* 确保内部容器宽度与外部容器相同 */
  justify-content: space-around; /* 第二行的元素水平分布 */
}
.flex-item {
  margin: 10px; /* 为元素提供一些空间 */
}
</style>
