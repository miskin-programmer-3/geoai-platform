import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

function PopulationChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="empty-chart">
        Aholi bo'yicha yillik ma'lumot topilmadi.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis
            yAxisId="population"
            tickFormatter={(value) =>
              `${Math.round(value / 1000)}k`
            }
          />
          <YAxis
            yAxisId="growth"
            orientation="right"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "population")
                return [
                  value.toLocaleString("uz-UZ"),
                  "Real aholi"
                ];

              if (name === "forecastPopulation")
                return [
                  value.toLocaleString("uz-UZ"),
                  "AI taxmin"
                ];

              return [
                value === null ? "-" : `${value}%`,
                "Yillik o'rtacha o'sish"
              ];
            }}
          />

          <Line
            yAxisId="population"
            type="monotone"
            dataKey="population"
            stroke="#38bdf8"
            strokeWidth={3}
            dot
          />

          <Line
            yAxisId="population"
            type="monotone"
            dataKey="forecastPopulation"
            stroke="#22c55e"
            strokeWidth={3}
            strokeDasharray="6 6"
            dot
          />

          <Line
            yAxisId="growth"
            type="monotone"
            dataKey="growthRate"
            stroke="#facc15"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PopulationChart;
