export interface StructuredCommand {
  domain: string;
  rawLine: string;
  fields: string[];
}

export class StructuredCommandParser {
  /**
   * Parses a mixed message into normal conversational text and structured domain commands.
   */
  public static parse(input: string): { normalText: string, commands: StructuredCommand[] } {
    const lines = input.split('\n');
    const normalTextLines: string[] = [];
    const commands: StructuredCommand[] = [];

    const domainRegex = /^(project|goal|habit|record|journal|relationship|certificate|achievement):\s*(.*)/i;

    for (const line of lines) {
      const match = line.match(domainRegex);
      if (match) {
        const domain = match[1].toLowerCase();
        const content = match[2];
        const fields = this.parseCsvLine(content);
        commands.push({ domain, rawLine: line, fields });
      } else {
        normalTextLines.push(line);
      }
    }

    return {
      normalText: normalTextLines.join('\n').trim(),
      commands
    };
  }

  /**
   * Parses comma-separated values, preserving empty spaces between commas
   * e.g. "A, , C" -> ["A", "", "C"]
   */
  private static parseCsvLine(line: string): string[] {
    if (!line.trim()) return [];
    return line.split(',').map(f => f.trim());
  }

  /**
   * Simple deterministic date normalizer for common terms.
   * Returns YYYY-MM format to match the `<input type="month">` UI.
   */
  public static normalizeDate(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const v = value.trim().toLowerCase();
    if (!v) return undefined;

    const now = new Date();
    
    if (v === 'today') {
      return now.toISOString().substring(0, 7);
    }
    if (v === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      return now.toISOString().substring(0, 7);
    }
    if (v === 'yesterday') {
      now.setDate(now.getDate() - 1);
      return now.toISOString().substring(0, 7);
    }
    
    // Try to parse as a real date (e.g. "Aug 2025", "Sep 2026")
    // Fix typos like "Set 2026" -> "Sep 2026"
    let dateToParse = value.trim();
    if (dateToParse.toLowerCase().startsWith('set ')) {
      dateToParse = dateToParse.replace(/^set/i, 'Sep');
    }
    
    const parsedDate = new Date(dateToParse);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().substring(0, 7);
    }
    
    // Otherwise return as is
    return value.trim();
  }

  /**
   * Normalizes URLs by prepending https:// if missing scheme.
   */
  public static normalizeUrl(url: string | undefined): string {
    let u = (url || '').trim();
    if (!u) return '';
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      return 'https://' + u;
    }
    return u;
  }

  /**
   * Normalizes status strings to Title Case to match UI dropdowns.
   */
  public static normalizeStatus(status: string | undefined): string {
    const s = (status || '').trim().toLowerCase();
    if (s === 'planning') return 'Planning';
    if (s === 'active') return 'Active';
    if (s === 'on hold') return 'On Hold';
    if (s === 'completed') return 'Completed';
    // Fallback to original
    return (status || '').trim();
  }
}
