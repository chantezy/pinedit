export function formatBatch(batch) {
  const lines = [
    "## PinEdit",
    `**页面:** ${batch.pageTitle || "未命名页面"}`,
    `**地址:** ${batch.pageUrl}`,
    `**视口:** ${batch.viewport.width}×${batch.viewport.height}`,
    `**批次:** ${batch.id}`,
    "",
  ];
  for (const note of batch.annotations) lines.push(...noteLines(note), "");
  lines.push("按「意见」改这个元素。尺寸只用来对照现在的大小；意见里没提到的内边距、字号、颜色、圆角不要顺手改。");
  return lines.join("\n").trim() + "\n";
}

function noteLines(note) {
  if (note.rect) {
    return [
      `### ${note.number}. 区域`,
      `**位置:** 页面坐标 ${note.rect.x}, ${note.rect.y}`,
      `**尺寸:** ${note.rect.width}×${note.rect.height}`,
      `**意见:** ${note.comment || "（未写意见）"}`,
      "**说明:** 这里要新加一块，页面上没有对应元素。",
    ];
  }
  const name = note.text ? `${note.tag}：「${note.text}」` : note.tag;
  return [
    `### ${note.number}. ${name}`,
    `**位置:** \`${note.selector}\``,
    ...(note.selected ? [] : [`**尺寸:** ${note.box.width}×${note.box.height}`]),
    `**意见:** ${note.comment || "（未写意见）"}`,
    ...(note.selected ? ["**说明:** 改的是圈选的这段文字，不是整个元素。"] : []),
  ];
}
