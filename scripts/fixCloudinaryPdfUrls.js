require('dotenv').config();
const { pool } = require('../src/config/database');

/**
 * Fix PDF URLs - revert /raw/upload/ back to /image/upload/
 * All PDFs were uploaded as 'image' type so they only exist at /image/upload/
 */
async function fixPdfUrls() {
  try {
    console.log('Fixing PDF URLs (reverting raw -> image)...\n');

    const result = await pool.query(`
      SELECT id, certificate_urls, cnic_urls, additional_urls 
      FROM student_records
    `);

    let totalFixed = 0;

    for (const row of result.rows) {
      const updates = {};
      let updated = false;

      const fixUrls = (urls) => {
        if (!urls || urls.length === 0) return urls;
        return urls.map(url => {
          // Revert raw back to image (files only exist as image type)
          if (url.includes('/raw/upload/')) {
            totalFixed++;
            return url.replace('/raw/upload/', '/image/upload/');
          }
          // Remove fl_attachment if present
          if (url.includes('/upload/fl_attachment/')) {
            totalFixed++;
            return url.replace('/upload/fl_attachment/', '/upload/');
          }
          return url;
        });
      };

      const fixedCerts = fixUrls(row.certificate_urls);
      const fixedCnic = fixUrls(row.cnic_urls);
      const fixedAdditional = fixUrls(row.additional_urls);

      if (JSON.stringify(fixedCerts) !== JSON.stringify(row.certificate_urls)) {
        updates.certificate_urls = fixedCerts;
        updated = true;
      }
      if (JSON.stringify(fixedCnic) !== JSON.stringify(row.cnic_urls)) {
        updates.cnic_urls = fixedCnic;
        updated = true;
      }
      if (JSON.stringify(fixedAdditional) !== JSON.stringify(row.additional_urls)) {
        updates.additional_urls = fixedAdditional;
        updated = true;
      }

      if (updated) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (updates.certificate_urls !== undefined) {
          setClauses.push(`certificate_urls = $${paramIndex++}`);
          values.push(updates.certificate_urls);
        }
        if (updates.cnic_urls !== undefined) {
          setClauses.push(`cnic_urls = $${paramIndex++}`);
          values.push(updates.cnic_urls);
        }
        if (updates.additional_urls !== undefined) {
          setClauses.push(`additional_urls = $${paramIndex++}`);
          values.push(updates.additional_urls);
        }

        values.push(row.id);
        await pool.query(
          `UPDATE student_records SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
        console.log(`✓ Fixed record ID: ${row.id}`);
      }
    }

    console.log(`\n✅ Done! Fixed ${totalFixed} URLs across ${result.rows.length} records.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPdfUrls();
