/**
 * Exports data to a CSV file and triggers a browser download
 * @param data Array of objects to export
 * @param filename Name of the file to download
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  // Get all unique headers from all objects in the array
  const allHeaders = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  );
  
  // Create CSV rows
  const csvRows = [
    // Header row
    allHeaders.join(','),
    // Data rows
    ...data.map(row => 
      allHeaders.map(header => {
        const val = row[header] ?? ''; // Handle missing values
        // Handle strings with commas by wrapping in quotes
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
