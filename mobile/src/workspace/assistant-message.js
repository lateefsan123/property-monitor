import { memo, useMemo } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { assistantLink, assistantTokens } from '../../../shared/assistant-markdown';

function Inline({ tokens = [], colors }) {
  return tokens.map((token, i) => {
    const children = token.tokens ? <Inline tokens={token.tokens} colors={colors} /> : token.text;
    if (token.type === 'br') return '\n';
    if (token.type === 'link') {
      const href = assistantLink(token.href);
      return <Text key={i} accessibilityRole={href ? 'link' : undefined} style={href ? styles.link : undefined}
        onPress={href ? () => Linking.openURL(href).catch(() => Alert.alert('Unable to open link', 'Please try again later.')) : undefined}>{children}</Text>;
    }
    const style = { strong: styles.strong, em: styles.em, del: styles.deleted, codespan: [styles.code, { backgroundColor: colors.bgInput }] }[token.type];
    return <Text key={i} style={style}>{children || token.raw}</Text>;
  });
}

function Blocks({ tokens, colors }) {
  const base = [styles.text, { color: colors.text }];
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'space': return null;
      case 'heading': return <Text key={i} selectable accessibilityRole="header" style={[base, styles.heading, token.depth > 2 && styles.smallHeading]}><Inline tokens={token.tokens} colors={colors} /></Text>;
      case 'paragraph': case 'text': return <Text key={i} selectable style={base}>{token.tokens ? <Inline tokens={token.tokens} colors={colors} /> : token.text}</Text>;
      case 'list': return <View key={i} style={styles.list}>{token.items.map((item, j) => <View key={j} style={styles.listItem}>
        <Text style={[base, styles.marker]}>{item.task ? (item.checked ? '☑' : '☐') : token.ordered ? `${Number(token.start) + j}.` : '•'}</Text>
        <View style={styles.listContent}><Blocks tokens={item.tokens} colors={colors} /></View>
      </View>)}</View>;
      case 'blockquote': return <View key={i} style={[styles.quote, { borderColor: colors.border }]}><Blocks tokens={token.tokens} colors={colors} /></View>;
      case 'code': return <ScrollView key={i} horizontal style={[styles.codeBlock, { backgroundColor: colors.bgInput }]} contentContainerStyle={styles.codePadding}><Text selectable style={[base, styles.code]}>{token.text}</Text></ScrollView>;
      case 'hr': return <View key={i} style={{ height: 1, backgroundColor: colors.border }} />;
      case 'table': return <ScrollView key={i} horizontal accessibilityLabel="Response table"><View>
        {[token.header, ...token.rows].map((row, j) => <View key={j} style={[styles.tableRow, { borderColor: colors.border, backgroundColor: j === 0 ? colors.bgInput : 'transparent' }]}>
          {row.map((cell, k) => <Text key={k} selectable style={[base, styles.cell, j === 0 && styles.strong]}><Inline tokens={cell.tokens} colors={colors} /></Text>)}
        </View>)}
      </View></ScrollView>;
      default: return <Text key={i} selectable style={base}>{token.text || token.raw}</Text>;
    }
  });
}

export default memo(function AssistantMessage({ message, colors }) {
  const user = message.role === 'user';
  const tokens = useMemo(() => message.role === 'user' ? [] : assistantTokens(message.content), [message.content, message.role]);
  return <View style={user ? [styles.user, { backgroundColor: colors.bgInput }] : styles.response}>
    {user ? <Text selectable accessibilityLabel={`You: ${message.content}`} style={[styles.text, { color: colors.text }]}>{message.content}</Text>
      : <Blocks tokens={tokens} colors={colors} />}
  </View>;
});

const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 26, flexShrink: 1 },
  user: { alignSelf: 'flex-end', maxWidth: '88%', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, marginBottom: 8 },
  response: { alignSelf: 'stretch', gap: 16, paddingVertical: 8, marginBottom: 18 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600', marginTop: 6 },
  smallHeading: { fontSize: 17, lineHeight: 26 },
  strong: { fontWeight: '600' }, em: { fontStyle: 'italic' }, deleted: { textDecorationLine: 'line-through' },
  link: { textDecorationLine: 'underline' },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14 },
  codeBlock: { borderRadius: 12 }, codePadding: { padding: 16 },
  list: { gap: 10 }, listItem: { flexDirection: 'row', gap: 10 },
  marker: { minWidth: 20, flexShrink: 0 }, listContent: { flex: 1, gap: 8 },
  quote: { borderLeftWidth: 3, paddingLeft: 16, gap: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1 }, cell: { width: 160, padding: 12 },
});
