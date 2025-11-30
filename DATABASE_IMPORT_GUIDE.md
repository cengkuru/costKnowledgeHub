# CoST Resources Database - Import Guide

**Date:** 2025-11-29
**Source Files:** cost-resources-database.json + RESOURCE_COMPILATION_SUMMARY.md

---

## Quick Start

### File: `cost-resources-database.json`
- **Format:** JSON (valid, jq-verified)
- **Records:** 32 resources
- **Size:** 40 KB
- **Structure:** Metadata + resources array + category/theme enumerations

### File: `RESOURCE_COMPILATION_SUMMARY.md`
- **Format:** Markdown documentation
- **Content:** Detailed analysis, context, and import guidelines
- **Size:** 16 KB

---

## Database Schema

### Main Resources Table

```sql
CREATE TABLE resources (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url VARCHAR(500) NOT NULL,
  pdf_url VARCHAR(500),
  resource_type VARCHAR(50) NOT NULL,
  publication_date VARCHAR(4),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search and filtering
CREATE INDEX idx_resource_type ON resources(resource_type);
CREATE INDEX idx_publication_date ON resources(publication_date);
CREATE INDEX idx_status ON resources(status);
CREATE FULLTEXT INDEX idx_title_description ON resources(title, description);
```

### Themes Junction Table

```sql
CREATE TABLE resource_themes (
  resource_id VARCHAR(255) NOT NULL,
  theme VARCHAR(100) NOT NULL,
  PRIMARY KEY (resource_id, theme),
  FOREIGN KEY (resource_id) REFERENCES resources(id),
  INDEX idx_theme (theme)
);
```

### Country Programs Junction Table

```sql
CREATE TABLE resource_country_programs (
  resource_id VARCHAR(255) NOT NULL,
  country_program VARCHAR(100) NOT NULL,
  PRIMARY KEY (resource_id, country_program),
  FOREIGN KEY (resource_id) REFERENCES resources(id),
  INDEX idx_country (country_program)
);
```

### Organizations Table

```sql
CREATE TABLE resource_organizations (
  resource_id VARCHAR(255) NOT NULL,
  organization VARCHAR(100) NOT NULL,
  PRIMARY KEY (resource_id, organization),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);
```

### Languages Table

```sql
CREATE TABLE resource_languages (
  resource_id VARCHAR(255) NOT NULL,
  language VARCHAR(20) NOT NULL,
  PRIMARY KEY (resource_id, language),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);
```

### Content Focus Table

```sql
CREATE TABLE resource_content_focus (
  resource_id VARCHAR(255) NOT NULL,
  focus_area VARCHAR(100) NOT NULL,
  PRIMARY KEY (resource_id, focus_area),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);
```

### Metadata Enumeration Table

```sql
CREATE TABLE resource_types (
  type_id VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100),
  description TEXT
);

INSERT INTO resource_types VALUES
('guidance', 'Guidance Document', 'Instructional guides and best practices'),
('technical_reference', 'Technical Reference', 'Technical documentation and schemas'),
('tool', 'Tool/Platform', 'Software tools for data management'),
('tool_directory', 'Tool Directory', 'Directory of available tools'),
('case_study', 'Case Study', 'Real-world implementations'),
('research', 'Research', 'Research papers and analysis'),
('article', 'Article', 'Blog posts and articles'),
('overview', 'Overview', 'General information overviews'),
('manual', 'Manual', 'Comprehensive guidebooks'),
('policy', 'Policy Document', 'Policy and legislative guidance'),
('resource_hub', 'Resource Hub', 'Central repositories'),
('platform', 'Platform', 'Interactive online platforms'),
('toolkit', 'Toolkit', 'Integrated toolkits'),
('example', 'Example', 'Example data and templates');
```

---

## Import Procedure

### Option 1: Direct JSON Import (Python)

```python
import json
import mysql.connector

# Load JSON
with open('cost-resources-database.json', 'r') as f:
    data = json.load(f)

# Connect to database
cnx = mysql.connector.connect(
    host="localhost",
    user="root",
    password="password",
    database="cost_hub"
)
cursor = cnx.cursor()

# Import main resources
for resource in data['resources']:
    cursor.execute("""
        INSERT INTO resources
        (id, title, description, url, pdf_url, resource_type, publication_date, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        resource['id'],
        resource['title'],
        resource['description'],
        resource['url'],
        resource.get('pdf_url'),
        resource['resource_type'],
        resource['publication_date'],
        resource['status']
    ))

# Import themes
for resource in data['resources']:
    for theme in resource.get('themes', []):
        cursor.execute("""
            INSERT INTO resource_themes (resource_id, theme)
            VALUES (%s, %s)
        """, (resource['id'], theme))

# Import country programs
for resource in data['resources']:
    for program in resource.get('country_programs', []):
        cursor.execute("""
            INSERT INTO resource_country_programs (resource_id, country_program)
            VALUES (%s, %s)
        """, (resource['id'], program))

# Similar for organizations, languages, content_focus...

cnx.commit()
cursor.close()
cnx.close()
```

### Option 2: Django ORM Import

```python
from resources.models import Resource, Theme, CountryProgram
import json

with open('cost-resources-database.json', 'r') as f:
    data = json.load(f)

for resource_data in data['resources']:
    resource = Resource.objects.create(
        id=resource_data['id'],
        title=resource_data['title'],
        description=resource_data['description'],
        url=resource_data['url'],
        pdf_url=resource_data.get('pdf_url'),
        resource_type=resource_data['resource_type'],
        publication_date=resource_data['publication_date'],
        status=resource_data['status']
    )

    # Add many-to-many relationships
    for theme_name in resource_data.get('themes', []):
        theme, _ = Theme.objects.get_or_create(name=theme_name)
        resource.themes.add(theme)

    for program_name in resource_data.get('country_programs', []):
        program, _ = CountryProgram.objects.get_or_create(name=program_name)
        resource.country_programs.add(program)
```

### Option 3: Laravel/PHP Import

```php
<?php
$json = json_decode(file_get_contents('cost-resources-database.json'), true);

foreach ($json['resources'] as $resourceData) {
    $resource = Resource::create([
        'id' => $resourceData['id'],
        'title' => $resourceData['title'],
        'description' => $resourceData['description'],
        'url' => $resourceData['url'],
        'pdf_url' => $resourceData['pdf_url'] ?? null,
        'resource_type' => $resourceData['resource_type'],
        'publication_date' => $resourceData['publication_date'],
        'status' => $resourceData['status']
    ]);

    // Attach relationships
    $resource->themes()->attach(array_map(function($theme) {
        return Theme::firstOrCreate(['name' => $theme])->id;
    }, $resourceData['themes']));

    $resource->countryPrograms()->attach(array_map(function($program) {
        return CountryProgram::firstOrCreate(['name' => $program])->id;
    }, $resourceData['country_programs']));
}
?>
```

### Option 4: MongoDB Import

```javascript
const fs = require('fs');
const mongodb = require('mongodb');

const data = JSON.parse(fs.readFileSync('cost-resources-database.json', 'utf8'));
const client = new mongodb.MongoClient('mongodb://localhost:27017');

async function importData() {
    const db = client.db('cost_hub');
    const resources = db.collection('resources');

    // Insert all resources
    await resources.insertMany(data.resources);

    // Create indexes
    await resources.createIndex({ resource_type: 1 });
    await resources.createIndex({ themes: 1 });
    await resources.createIndex({ country_programs: 1 });
    await resources.createIndex({ $text: { title: 1, description: 1 } });

    await client.close();
}

importData();
```

---

## Data Validation Checklist

Before importing, verify:

- [ ] JSON file is valid (`jq . cost-resources-database.json`)
- [ ] All 32 resources are present
- [ ] No duplicate IDs exist
- [ ] All URLs are accessible (optional validation)
- [ ] Theme values match your enumeration
- [ ] Country programs are consistent
- [ ] Resource types are in your database
- [ ] No NULL values in required fields (title, url, id)

### Validation Script

```bash
#!/bin/bash

# Validate JSON
echo "Validating JSON..."
jq . cost-resources-database.json > /dev/null || exit 1

# Count resources
echo "Resource count:"
jq '.resources | length' cost-resources-database.json

# Check for duplicates
echo "Checking for duplicate IDs..."
jq '.resources[].id' cost-resources-database.json | sort | uniq -d

# List all resource types
echo "Resource types:"
jq '.resources[].resource_type' cost-resources-database.json | sort -u

# List all themes
echo "All themes:"
jq '.resources[].themes[]' cost-resources-database.json | sort -u | wc -l
```

---

## Search Indexes & Optimization

### Required Indexes for Performance

```sql
-- Full-text search
ALTER TABLE resources ADD FULLTEXT INDEX ft_title_description (title, description);

-- Filtering
CREATE INDEX idx_resource_type ON resources(resource_type);
CREATE INDEX idx_status ON resources(status);
CREATE INDEX idx_publication_date ON resources(publication_date);

-- Relationship lookups
CREATE INDEX idx_theme_resource ON resource_themes(theme);
CREATE INDEX idx_country_resource ON resource_country_programs(country_program);

-- Combined indexes for common queries
CREATE INDEX idx_type_status ON resources(resource_type, status);
CREATE INDEX idx_date_type ON resources(publication_date DESC, resource_type);
```

---

## Common Queries

### Find all guidance documents

```sql
SELECT * FROM resources
WHERE resource_type = 'guidance'
ORDER BY publication_date DESC;
```

### Search by keyword

```sql
SELECT DISTINCT r.* FROM resources r
WHERE MATCH(r.title, r.description) AGAINST('disclosure' IN BOOLEAN MODE)
ORDER BY MATCH(r.title, r.description) AGAINST('disclosure') DESC;
```

### Find resources by country program

```sql
SELECT r.* FROM resources r
JOIN resource_country_programs cp ON r.id = cp.resource_id
WHERE cp.country_program = 'Ethiopia'
ORDER BY r.publication_date DESC;
```

### Find resources with multiple themes

```sql
SELECT r.* FROM resources r
WHERE r.id IN (
    SELECT resource_id FROM resource_themes
    WHERE theme IN ('transparency', 'disclosure')
    GROUP BY resource_id
    HAVING COUNT(DISTINCT theme) = 2
);
```

### Most recent resources

```sql
SELECT * FROM resources
ORDER BY publication_date DESC
LIMIT 10;
```

### Resources available in Spanish

```sql
SELECT DISTINCT r.* FROM resources r
JOIN resource_languages rl ON r.id = rl.resource_id
WHERE rl.language = 'Spanish'
ORDER BY r.publication_date DESC;
```

---

## Data Updates & Maintenance

### Scheduled Validation

```bash
#!/bin/bash
# Run weekly to verify URLs are still accessible

for url in $(jq -r '.resources[].url' cost-resources-database.json); do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$http_code" != "200" ]; then
        echo "WARNING: $url returned $http_code"
    fi
done
```

### Adding New Resources

```json
{
  "id": "new-resource-id",
  "title": "Resource Title",
  "description": "Description of the resource",
  "url": "https://example.com/resource",
  "pdf_url": "https://example.com/resource.pdf",
  "resource_type": "guidance",
  "themes": ["transparency", "disclosure"],
  "languages": ["English"],
  "organizations": ["CoST"],
  "country_programs": ["Costa Rica"],
  "content_focus": ["disclosure", "data_standards"],
  "publication_date": "2025",
  "status": "active"
}
```

### Updating Resource Status

```sql
UPDATE resources
SET status = 'deprecated', updated_at = NOW()
WHERE id = 'resource-id';
```

---

## API Integration Example

### REST API Endpoints

```
GET /api/resources                    -- List all resources
GET /api/resources/{id}               -- Get specific resource
GET /api/resources?type=guidance      -- Filter by type
GET /api/resources?theme=transparency -- Filter by theme
GET /api/resources?country=Ethiopia   -- Filter by country
GET /api/search?q=disclosure          -- Full-text search
GET /api/themes                       -- List all themes
GET /api/countries                    -- List all countries
GET /api/resource-types               -- List all resource types
```

### Example Response

```json
{
  "id": "cost-disclosure-manual",
  "title": "CoST Disclosure Manual",
  "description": "Comprehensive guidance...",
  "url": "https://infrastructuretransparency.org/resource/cost-disclosure-manual/",
  "resource_type": "guidance",
  "themes": ["disclosure", "transparency"],
  "country_programs": ["Costa Rica", "Ethiopia"],
  "languages": ["English"],
  "publication_date": "2020",
  "status": "active",
  "created_at": "2025-11-29T00:00:00Z",
  "updated_at": "2025-11-29T00:00:00Z"
}
```

---

## File Locations

**Generated Files:**
- Database: `/Users/cengkurumichael/Dev/cost-knowledge-hub/cost-resources-database.json`
- Summary: `/Users/cengkurumichael/Dev/cost-knowledge-hub/RESOURCE_COMPILATION_SUMMARY.md`
- This Guide: `/Users/cengkurumichael/Dev/cost-knowledge-hub/DATABASE_IMPORT_GUIDE.md`

**Size Details:**
- JSON: 40 KB
- Summary: 16 KB
- Total: 56 KB (highly portable)

---

## Next Steps

1. **Prepare Database:** Run schema creation SQL scripts
2. **Import Data:** Use one of the import methods above
3. **Create Indexes:** Run index creation scripts
4. **Validate:** Run validation checks
5. **Test Queries:** Run sample queries from Common Queries section
6. **Deploy API:** Connect to REST API endpoints
7. **Monitor:** Set up scheduled URL validation

---

## Support & Resources

**For questions about:**
- **CoST Initiative:** CoST@infrastructuretransparency.org
- **OC4IDS Standard:** support@open-contracting.org
- **Database Import:** Refer to RESOURCE_COMPILATION_SUMMARY.md

---

**Import Status:** Ready for Production
**Verification:** Complete and verified ✓
**Date Generated:** 2025-11-29
