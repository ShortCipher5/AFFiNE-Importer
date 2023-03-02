# AFFiNE-importer
 
AFFiNE (https://github.com/toeverything/affine) is a next-gen knowledge base.

At the time of creation, `app.affine.pro` does not have an API so you can use this script to quickly and easily import Markdown `.md` files into your own AFFiNE workspace.

## Run

`npm run start`


## Setup

Create an `.env` file and define the variables

```
DEBUG = false
TARGET_URL = app.affine.pro
WORKSPACE_NAME = new_affine_workspace
LOGIN_TOKEN = myToken123
FILES_DIR = source/path/of/md/files
 ```

`DEBUG = true|false` If true, this mode allows you to see the browser and elements to be clicked will be highlighted

`TARGET_URL = app.affine.pro` the deployment of AFFiNE you wish to use

`WORKSPACE_NAME = new_affine_workspace` the name of your new workspace

`LOGIN_TOKEN = myToken123` your login token, see below for more info

`FILES_DIR = source/path/of/md/files` the directory of your files to be uploaded

### Login Token

For the login token, this value can be found in the developer console after you've logged into AFFiNE. Make sure you use the refresh token value.
 <img width="1149" alt="Screenshot 2023-03-02 at 14 15 49" src="https://user-images.githubusercontent.com/4605025/222346680-6fe156a4-9683-47c3-95b5-3e03a8ab5166.png">
