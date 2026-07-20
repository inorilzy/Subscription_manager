import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { BackupDocument } from '../application/backup'

export interface ExportResult {
  method: 'share' | 'download' | 'display'
  fileName: string
}

/** Write the backup to a device file and open the share sheet; browser falls back to download. */
export async function deliverBackup(doc: BackupDocument): Promise<ExportResult> {
  const json = JSON.stringify(doc, null, 2)
  const stamp = doc.exportedAt.slice(0, 10)
  const fileName = `subscout-backup-${stamp}.json`

  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({
      title: fileName,
      url: written.uri,
      dialogTitle: fileName,
    })
    return { method: 'share', fileName }
  }

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
    return { method: 'download', fileName }
  }

  return { method: 'display', fileName }
}
