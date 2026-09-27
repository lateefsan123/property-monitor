import ContentSkeleton from "../components/ContentSkeleton";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

export default function HomeActivity({ series, days, onDaysChange, ready, loading, colors }) {
  const [chartWidth, setChartWidth] = useState(320);
  const visible = series.slice(-days);
  const total = visible.reduce((sum, point) => sum + point.count, 0);
  const height = 180;
  const max = Math.max(4, Math.ceil(Math.max(...visible.map(point => point.count)) / 4) * 4);
  const step = (chartWidth - 28) / visible.length;
  const labelIndices = [0, Math.floor((visible.length - 1) / 2), visible.length - 1];
  return <View onLayout={event => setChartWidth(Math.max(1, event.nativeEvent.layout.width))} style={{ gap: 24 }}>
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ gap: 6, flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Messages sent</Text>
        <Text selectable style={{ color: colors.textName, fontSize: 42, lineHeight: 48, fontWeight: "600", letterSpacing: -1.2, fontVariant: ["tabular-nums"] }}>{ready ? total.toLocaleString() : "—"}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Last {days} days</Text>
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: colors.bgBadge, padding: 3, borderRadius: 12 }}>
        {[7, 14].map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={`Last ${value} days`} accessibilityState={{ selected: days === value }} onPress={() => onDaysChange(value)}
          style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: days === value ? colors.bgCard : "transparent" }}>
          <Text style={{ color: days === value ? colors.textName : colors.textMuted, fontSize: 13, fontWeight: days === value ? "600" : "400" }}>{value}D</Text>
        </Pressable>)}
      </View>
    </View>
    {loading ? <ContentSkeleton colors={colors} rows={2} label="Loading message activity" /> : ready ? <View style={{ gap: 12 }}>
      <Svg width="100%" height={height + 26} viewBox={`0 0 ${chartWidth} ${height + 26}`} accessibilityLabel={`${total} messages sent in the last ${days} days`}>
        {[0, 0.5, 1].map(ratio => <Line key={ratio} x1={0} x2={chartWidth - 28} y1={8 + ratio * (height - 20)} y2={8 + ratio * (height - 20)} stroke={colors.border} strokeDasharray={ratio === 1 ? undefined : "3 5"} />)}
        {[0, 0.5, 1].map(ratio => <SvgText key={ratio} x={chartWidth} y={12 + ratio * (height - 20)} fontSize={10} fill={colors.textMuted} textAnchor="end">{max * (1 - ratio)}</SvgText>)}
        {visible.map((point, index) => <Rect key={point.key} x={index * step + step * 0.18} y={height - 12 - (point.count / max) * (height - 20)} width={step * 0.64} height={(point.count / max) * (height - 20)} rx={3} fill={colors.statValue} opacity={index === visible.length - 1 ? 1 : 0.5} />)}
        {labelIndices.map(index => <SvgText key={index} x={index === 0 ? 0 : index === visible.length - 1 ? chartWidth - 28 : index * step + step / 2} y={height + 14} fontSize={11} fill={colors.textMuted} textAnchor={index === 0 ? "start" : index === visible.length - 1 ? "end" : "middle"}>{visible[index]?.label}</SvgText>)}
      </Svg>
      {total === 0 ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>No messages sent in this period.</Text> : null}
    </View> : <Text style={{ color: colors.textMuted, fontSize: 14, paddingVertical: 24 }}>Message activity unavailable.</Text>}
  </View>;
}
