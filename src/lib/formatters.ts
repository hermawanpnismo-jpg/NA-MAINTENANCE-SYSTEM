export function formatIDR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    let cleanStr = dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      cleanStr = `${dateStr}T00:00:00+07:00`;
    }
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    let cleanStr = dateStr;
    // If it's SQLite format "YYYY-MM-DD HH:mm:ss" without timezone, treat as UTC or local
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      cleanStr = dateStr.replace(' ', 'T') + '+07:00';
    }
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' WIB';
  } catch {
    return dateStr;
  }
}

/**
 * Returns current online date & time formatted for Jakarta (WIB)
 */
export function getOnlineTimestampWIB(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleString('sv', { timeZone: 'Asia/Jakarta' }).substring(0, 19);
}

/**
 * Returns current online date (YYYY-MM-DD) for date inputs
 */
export function getOnlineDateWIB(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleString('sv', { timeZone: 'Asia/Jakarta' }).substring(0, 10);
}

/**
 * Returns current online date-time (YYYY-MM-DDTHH:mm) for datetime-local inputs
 */
export function getOnlineDateTimeInputWIB(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleString('sv', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T').substring(0, 16);
}

/**
 * Returns live clock string formatted with HH:mm:ss WIB
 */
export function getOnlineTimeWIB(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + ' WIB';
}

export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  } else if (hours > 0) {
    return `${hours} hours`;
  }
  return `${remainingMins} min`;
}

export function generateCSVString(rows: Record<string, any>[]): string {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          let val = row[h];
          if (val === null || val === undefined) val = '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    )
  ].join('\r\n');
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  const csvContent = generateCSVString(rows);
  if (!csvContent) return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
