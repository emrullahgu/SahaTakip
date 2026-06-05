// MarkdownText — bağımlılıksız, hafif markdown renderer.
// Copilot yanıtları markdown üretir (başlık, kalın, madde, tablo, KDV tablosu).
// Önceden düz <Text> ile gösteriliyordu → kullanıcı ham `**`, `|`, `#` görüyordu.
// Bu bileşen yaygın markdown alt kümesini gerçek görünür biçime çevirir.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface Props {
  content: string;
  color?: string;
  size?: number;
}

/** `**kalın**` ve `` `kod` `` parçalarını <Text> segmentlerine böler. */
function renderInline(text: string, baseColor: string, size: number, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // **bold** veya `code` yakala
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Text key={`${keyPrefix}-t${i++}`} style={{ color: baseColor, fontSize: size }}>{text.slice(last, m.index)}</Text>);
    }
    const tok = m[0];
    if (tok.startsWith('**')) {
      nodes.push(<Text key={`${keyPrefix}-b${i++}`} style={{ color: baseColor, fontSize: size, fontWeight: '800' }}>{tok.slice(2, -2)}</Text>);
    } else {
      nodes.push(
        <Text key={`${keyPrefix}-c${i++}`} style={{ color: baseColor, fontSize: size - 1, fontFamily: 'monospace', backgroundColor: 'rgba(148,163,184,0.18)' }}>
          {tok.slice(1, -1)}
        </Text>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) {
    nodes.push(<Text key={`${keyPrefix}-t${i++}`} style={{ color: baseColor, fontSize: size }}>{text.slice(last)}</Text>);
  }
  return nodes.length ? nodes : [<Text key={`${keyPrefix}-empty`} style={{ color: baseColor, fontSize: size }}>{text}</Text>];
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes('-');

function splitCells(l: string): string[] {
  return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

export default function MarkdownText({ content, color = colors.text.primary, size = typography.md }: Props) {
  const lines = (content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let key = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const line = raw.replace(/\s+$/, '');

    // --- Tablo bloğu ---
    if (isTableRow(line) && idx + 1 < lines.length && isTableSep(lines[idx + 1])) {
      const header = splitCells(line);
      const rows: string[][] = [];
      idx += 2; // başlık + ayraç satırını atla
      while (idx < lines.length && isTableRow(lines[idx])) {
        rows.push(splitCells(lines[idx]));
        idx++;
      }
      idx--; // dış döngü idx++ yapacak
      blocks.push(
        <View key={`tbl${key++}`} style={st.table}>
          <View style={[st.tr, st.trHead]}>
            {header.map((c, i) => (
              <View key={i} style={st.td}><Text style={[st.cellText, { color }]} numberOfLines={3}>{renderInline(c, color, size - 2, `h${i}`)}</Text></View>
            ))}
          </View>
          {rows.map((r, ri) => (
            <View key={ri} style={[st.tr, ri % 2 === 1 && st.trAlt]}>
              {header.map((_, ci) => (
                <View key={ci} style={st.td}><Text style={[st.cellText, { color }]} numberOfLines={4}>{renderInline(r[ci] ?? '', color, size - 2, `r${ri}-${ci}`)}</Text></View>
              ))}
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // --- Yatay çizgi ---
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<View key={`hr${key++}`} style={st.hr} />);
      continue;
    }

    // --- Boş satır ---
    if (line.trim() === '') {
      blocks.push(<View key={`sp${key++}`} style={{ height: spacing.xs }} />);
      continue;
    }

    // --- Başlık ---
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const hSize = size + (level === 1 ? 6 : level === 2 ? 3 : 1);
      blocks.push(
        <Text key={`h${key++}`} style={{ color, fontSize: hSize, fontWeight: '800', marginTop: spacing.xs }}>
          {renderInline(h[2], color, hSize, `head${key}`)}
        </Text>,
      );
      continue;
    }

    // --- Madde işareti ---
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <View key={`li${key++}`} style={st.liRow}>
          <Text style={{ color, fontSize: size, lineHeight: size * 1.4 }}>•  </Text>
          <Text style={{ flex: 1, lineHeight: size * 1.4 }}>{renderInline(bullet[1], color, size, `bl${key}`)}</Text>
        </View>,
      );
      continue;
    }

    // --- Numaralı liste ---
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ol) {
      blocks.push(
        <View key={`ol${key++}`} style={st.liRow}>
          <Text style={{ color, fontSize: size, lineHeight: size * 1.4, fontWeight: '700' }}>{ol[1]}.  </Text>
          <Text style={{ flex: 1, lineHeight: size * 1.4 }}>{renderInline(ol[2], color, size, `ol${key}`)}</Text>
        </View>,
      );
      continue;
    }

    // --- Normal paragraf ---
    blocks.push(
      <Text key={`p${key++}`} style={{ lineHeight: size * 1.45 }}>
        {renderInline(line, color, size, `p${key}`)}
      </Text>,
    );
  }

  return <View style={{ gap: 2 }}>{blocks}</View>;
}

const st = StyleSheet.create({
  hr: { height: 1, backgroundColor: colors.border.secondary, marginVertical: spacing.xs },
  liRow: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: spacing.sm },
  table: { borderWidth: 1, borderColor: colors.border.secondary, borderRadius: 8, overflow: 'hidden', marginVertical: spacing.xs },
  tr: { flexDirection: 'row' },
  trHead: { backgroundColor: 'rgba(148,163,184,0.22)' },
  trAlt: { backgroundColor: 'rgba(148,163,184,0.08)' },
  td: { flex: 1, paddingVertical: 6, paddingHorizontal: 6, borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.border.secondary },
  cellText: { fontSize: typography.sm },
});
