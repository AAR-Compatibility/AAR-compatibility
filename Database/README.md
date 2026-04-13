# The excel file

The Excel file `AAR_matrix_2.xlsx` is the source for the database import. It contains the tanker, receiver, and specification data that is loaded into PostgreSQL by `AAR_excel_to_sql.py`.

The excel file is based on all national SRD's.

I think it is best to just all work in the "specifications sheet".
Do not rename the sheets that the script depends on. The Python import reads the workbook by sheet name and expects `Tankers`, `Receivers`, and `Specifications`.

Run `AAR_excel_to_sql.py` to upload the Excel data to the local PostgreSQL database. The required Python packages and the full reset/rebuild/reload steps are documented in the [main README](../README.md).

```bash
python .\Database\AAR_excel_to_sql.py
```

If you are working on one of the SRD's: please comment here. This way we can prevent people doing redundant work or ruining other work. Make sure that you know how far you are. Pherhaps it is also an idea, to first work in a seperate sheet and then add the complete sheet when you are sure that it is finished!
## Tankers and Receivers

| SRD           | Responsible | Done?   |
|---------------|-------------|---------|
| Australia     | Eva         | No (JAN 2026)
| Canada        |             | 
| MMF           | Mike        | Yes (FEB 2026)
| USA           | Mike        | No. Only start with KC-135 


