import glob
import pandas as pd
import os
import sys

# Get command line arguments
arguments = sys.argv

# Use argument 1 as the folder path containing the csv files
path = arguments[1:]

# Get all of the CSV files in the folder
all_files = glob.glob(os.path.join(path, "*.csv"))

writer = pd.ExcelWriter('_output.xlsx', engine='xlsxwriter')

for f in all_files:
    df = pd.read_csv(f)
    df.to_excel(writer, sheet_name=os.path.splitext(os.path.basename(f))[0], index=False)

writer.save()