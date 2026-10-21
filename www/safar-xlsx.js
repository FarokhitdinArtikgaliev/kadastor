(() => {
  'use strict';

  const encoder = new TextEncoder();
  const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[ch]));
  const columnName = index => {
    let name = '';
    while (index) {
      const remainder = (index - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  };
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let value = n;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      table[n] = value >>> 0;
    }
    return table;
  })();
  const crc32 = bytes => {
    let checksum = 0xffffffff;
    for (const byte of bytes) checksum = crcTable[(checksum ^ byte) & 255] ^ (checksum >>> 8);
    return (checksum ^ 0xffffffff) >>> 0;
  };
  const joinBytes = chunks => {
    const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  function zip(files) {
    const localFiles = [];
    const centralFiles = [];
    let offset = 0;
    for (const file of files) {
      const filename = encoder.encode(file.name);
      const content = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
      const checksum = crc32(content);
      const local = new Uint8Array(30 + filename.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 33, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, content.length, true);
      localView.setUint32(22, content.length, true);
      localView.setUint16(26, filename.length, true);
      localView.setUint16(28, 0, true);
      local.set(filename, 30);
      localFiles.push(local, content);

      const central = new Uint8Array(46 + filename.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 33, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, content.length, true);
      centralView.setUint32(24, content.length, true);
      centralView.setUint16(28, filename.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(filename, 46);
      centralFiles.push(central);
      offset += local.length + content.length;
    }

    const directory = joinBytes(centralFiles);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, directory.length, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);
    return joinBytes([...localFiles, directory, end]);
  }

  function cell(reference, value, style) {
    const styleAttribute = style ? ` s="${style}"` : '';
    if (value === null || value === undefined || value === '') return `<c r="${reference}"${styleAttribute}/>`;
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
    return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  }

  function dataRow(values, rowNumber) {
    const cells = values.map((value, index) => {
      const column = index + 1;
      const style = rowNumber === 1 ? 1 : rowNumber === 2 ? 2 :
        ([2, 7].includes(column) ? 3 : column === 12 ? 4 : column === 13 ? 5 : 6);
      return cell(columnName(column) + rowNumber, value, style);
    }).join('');
    const height = rowNumber === 1 ? ' ht="32" customHeight="1"' : rowNumber === 2 ? ' ht="34" customHeight="1"' : '';
    return `<row r="${rowNumber}"${height}>${cells}</row>`;
  }

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd.mm.yyyy, hh:mm"/><numFmt numFmtId="165" formatCode="[h]&quot; ч &quot;mm&quot; мин&quot;"/><numFmt numFmtId="166" formatCode="0.0"/></numFmts>
<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FF175345"/><sz val="10"/><name val="Arial"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17695B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4F1EC"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD5E1DD"/></left><right style="thin"><color rgb="FFD5E1DD"/></right><top style="thin"><color rgb="FFD5E1DD"/></top><bottom style="thin"><color rgb="FFD5E1DD"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  function worksheet(rows) {
    const headers = [
      ['Тартиб раками', 'Бошланиш санаси ва вакти', 'Каердан', null, null, null, 'Тугаш санаси ва вакти', 'Каерга', null, null, null, 'Жами сарфланган вакт', 'Жами масофа'],
      [null, null, 'Номи', 'Вилоят', 'Манзил', 'Координаталари', null, 'Номи', 'Вилоят', 'Манзил', 'Координаталари', null, null]
    ];
    const allRows = [...headers, ...rows];
    const rowContent = allRows.map((row, index) => dataRow(row, index + 1)).join('');
    const widths = [7, 22, 29, 18, 40, 29, 22, 29, 18, 40, 29, 21, 16]
      .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:M${allRows.length}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>${widths}</cols><sheetData>${rowContent}</sheetData><mergeCells count="7"><mergeCell ref="A1:A2"/><mergeCell ref="B1:B2"/><mergeCell ref="C1:F1"/><mergeCell ref="G1:G2"/><mergeCell ref="H1:K1"/><mergeCell ref="L1:L2"/><mergeCell ref="M1:M2"/></mergeCells><pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  }

  function build(rows) {
    const files = [
      { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Safar ma&apos;lumoti" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', content: styles },
      { name: 'xl/worksheets/sheet1.xml', content: worksheet(rows) }
    ];
    return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  window.SafarXlsx = { build };
})();
