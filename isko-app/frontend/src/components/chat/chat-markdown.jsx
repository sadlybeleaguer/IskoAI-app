import { Fragment } from "react"

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

function isDividerRow(line) {
  const cells = splitTableRow(line)
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function parseInline(text) {
  const parts = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-muted px-1.5 py-0.5 text-[0.92em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else {
      parts.push(
        <strong key={`${match.index}-strong`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function cleanListItemText(text) {
  return text.replace(/^\[[ xX]\]\s+/, "")
}

function flushParagraph(blocks, paragraph) {
  if (!paragraph.length) {
    return
  }

  blocks.push({
    type: "paragraph",
    text: paragraph.join(" "),
  })
  paragraph.length = 0
}

function parseMarkdown(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks = []
  const paragraph = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph(blocks, paragraph)
      index += 1
      continue
    }

    const fenceMatch = trimmed.match(/^```(\w+)?/)
    if (fenceMatch) {
      flushParagraph(blocks, paragraph)
      const language = fenceMatch[1] ?? ""
      const codeLines = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }

      blocks.push({
        type: "code",
        language,
        text: codeLines.join("\n"),
      })

      index += index < lines.length ? 1 : 0
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph(blocks, paragraph)
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      })
      index += 1
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph(blocks, paragraph)
      blocks.push({ type: "divider" })
      index += 1
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph(blocks, paragraph)
      const items = []

      while (index < lines.length) {
        const itemMatch = lines[index].trim().match(/^[-*]\s+(.+)$/)
        if (!itemMatch) {
          break
        }
        items.push(cleanListItemText(itemMatch[1]))
        index += 1
      }

      blocks.push({ type: "list", ordered: false, items })
      continue
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph(blocks, paragraph)
      const items = []

      while (index < lines.length) {
        const itemMatch = lines[index].trim().match(/^\d+[.)]\s+(.+)$/)
        if (!itemMatch) {
          break
        }
        items.push(cleanListItemText(itemMatch[1]))
        index += 1
      }

      blocks.push({ type: "list", ordered: true, items })
      continue
    }

    if (
      trimmed.includes("|") &&
      index + 1 < lines.length &&
      isDividerRow(lines[index + 1])
    ) {
      flushParagraph(blocks, paragraph)
      const headers = splitTableRow(trimmed)
      const rows = []
      index += 2

      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }

      blocks.push({ type: "table", headers, rows })
      continue
    }

    paragraph.push(trimmed)
    index += 1
  }

  flushParagraph(blocks, paragraph)
  return blocks
}

export function ChatMarkdown({ content }) {
  const blocks = parseMarkdown(content)

  return (
    <div className="chat-markdown">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level <= 1 ? "h2" : `h${Math.min(block.level, 4)}`

          return (
            <Heading key={index}>
              {parseInline(block.text)}
            </Heading>
          )
        }

        if (block.type === "paragraph") {
          return <p key={index}>{parseInline(block.text)}</p>
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul"

          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{parseInline(item)}</li>
              ))}
            </List>
          )
        }

        if (block.type === "code") {
          return (
            <pre key={index}>
              {block.language ? (
                <span className="chat-markdown-code-language">
                  {block.language}
                </span>
              ) : null}
              <code>{block.text}</code>
            </pre>
          )
        }

        if (block.type === "table") {
          return (
            <div key={index} className="chat-markdown-table-scroll">
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={headerIndex}>{parseInline(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={cellIndex}>
                          {parseInline(row[cellIndex] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === "divider") {
          return <hr key={index} />
        }

        return <Fragment key={index} />
      })}
    </div>
  )
}
