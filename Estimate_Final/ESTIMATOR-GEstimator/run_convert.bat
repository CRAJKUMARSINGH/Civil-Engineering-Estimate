@echo off
python convert_projects.py > output.txt 2>&1
type output.txt
