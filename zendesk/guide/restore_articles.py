import os

import requests
from bs4 import BeautifulSoup


# Settings
credentials = 'your_zendesk_email', 'your_zendesk_password'
zendesk = 'https://your_instance.zendesk.com'
backup_folder = '20xx-xx-xx'
language = 'en-us'
restore_list = [100000001, 100000002]

# Verify backup path is OK
backup_path = os.path.join(backup_folder, language)
if not os.path.exists(backup_path):
    print('The specified backup path does not exist. Check the folder name and locale.')
    exit()

# Restore articles
for article in restore_list:
    file_path = os.path.join(backup_path, str(article) + '.html')
    with open(file_path, mode='r', encoding='utf-8') as f:
        html_source = f.read()
    tree = BeautifulSoup(html_source, 'lxml')
    title = tree.h1.string.strip()
    tree.h1.decompose()
    payload = {'translation': {'title': title, 'body': str(tree.body)}}
    endpoint = '/api/v2/help_center/articles/{id}/translations/{loc}.json'.format(
        id=article, loc=language.lower())
    url = zendesk + endpoint
    response = requests.put(url, json=payload, auth=credentials)
    if response.status_code == 200:
        print('Article {} restored'.format(article))
    else:
        print('Failed to update article {} with error {}, {}'.format(
            article, response.status_code, response.reason))
