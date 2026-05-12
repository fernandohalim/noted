import JSZip from 'jszip';

interface FolderTreeItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id: string | null;
  content: string;
  relative_path: string;
}

export function downloadTextFile(filename: string, content: string) {
  const safeName = filename.toLowerCase().endsWith('.txt') ? filename : `${filename}.txt`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, safeName);
}

export async function downloadFolderAsZip(folderName: string, items: FolderTreeItem[]) {
  const zip = new JSZip();
  for (const item of items) {
    if (item.type === 'file') {
      zip.file(item.relative_path, item.content || '');
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${folderName}.zip`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}