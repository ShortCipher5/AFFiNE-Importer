const os = require('os');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');
const { chromium } = playwright;

const dotenv = require('dotenv');
dotenv.config();

const isMac = (os.platform() === 'darwin');

(async () => {

  // debug mode?
  let debug = process.env.DEBUG == "true" ? true : false;

  // the md files to process
  let dirPath = process.env.FILES_DIR
  const files = fs.readdirSync(dirPath).filter(file => {
    return file.endsWith('.md') || file.endsWith('.MD');
  }).sort((a, b) => {
    const aStat = fs.statSync(path.join(dirPath, a));
    const bStat = fs.statSync(path.join(dirPath, b));
    return aStat.birthtimeMs - bStat.birthtimeMs;
  });
  
  // init browser
  const browser = await chromium.launch({
    headless: process.env.DEBUG !== 'true'
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  let pageLoadElement = "[data-testid=current-workspace]"

  run()

  // functions

  async function run(){
    console.log('Browser init: heading to ' + process.env.TARGET_URL)
    await page.goto('http://' + process.env.TARGET_URL);

    console.log('Creating new workspace: ' + process.env.WORKSPACE_NAME)
    //await newWorkspace(process.env.WORKSPACE_NAME);

    // calls newPage for each file in the directory
    console.log('Being processing files')
    await processFiles()

    console.log('Attempting to login to AFFiNE')
    await login()

    console.log('Attempting to publish workspace')
    await publish()

    if(!debug){
      await browser.close();
    }
  }

  async function newWorkspace(workspaceName){
    // wait for page loaded
    await page.waitForSelector(pageLoadElement);

    // open workspaces list
    await selectorFunction('[data-testid=current-workspace]');

    // wait for workspace modal
    await page.waitForSelector("[role='presentation']");
    //const newWorkspaceDiv = await page.$('div.modal-popup > div:scope > div:has-text("New Workspace")');

    // activate new workspace prompt
    // this div is child child child of the modal popup
    await selectorFunction('div:has-text("New Workspace") > *:has-text("New Workspace") > *:has-text("New Workspace") > *:has-text("New Workspace")');

    // fill workspace name
    await page.fill("[role='presentation'] input", workspaceName);

    // create workspace
    await selectorFunction('button:has-text("Create")');
  }

  async function newPage(pageTitle, pageContent){

    // create new page
    await selectorFunction('[data-testid=sliderBar] > div:has-text("New Page")');

    // copy contents to clipboard
    await page.evaluate(content => {
      // create a temporary textarea element to hold the content
      const textarea = document.createElement('textarea');
      textarea.value = content;
    
      // add the textarea to the DOM and select its contents
      document.body.appendChild(textarea);
      textarea.select();
    
      // copy the contents to the clipboard and remove the textarea
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }, pageContent);

    // give time for the clipboard to be updated
    await new Promise(resolve => setTimeout(resolve, 500));

    // fill the title
    await page.getByPlaceholder('Title').fill(pageTitle);
    await page.getByRole('paragraph').click();

    // paste the contents
    const modifier = isMac ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyV`);

    /* type unreliable, so use clipboard
    //await selectorFunction('.affine-block-children-container');
    //await page.type(".affine-block-children-container", pageContent);
    */
   
    if(debug){
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
  }

  async function login(){
    // login
    let refreshToken = process.env.LOGIN_TOKEN
    await page.evaluate((refreshToken) => {
      window.localStorage.setItem('affine:login', JSON.stringify({ 
        refresh: refreshToken
      }));
    }, refreshToken);

    // reload page and wait loaded
    await page.reload();
    await page.waitForSelector(pageLoadElement);
  }

  async function publish(){
    // define workspace settings url (replace last part of url)
    const urlParts = page.url().replace(/\/$/, "").split('/');
    urlParts.pop();
    settingsPage= urlParts.join('/') + '/setting';

    // load settings page
    await page.goto(settingsPage);
    await page.waitForSelector(pageLoadElement);
    await selectorFunction('[data-setting-tab-button="Publish"]');

    // enable affine cloud, if necessary
    if(await page.$('span:has-text("Enable AFFiNE Cloud")')) {
      console.log("Enabling AFFiNE Cloud on workspace")
      await selectorFunction('button:has-text("Enable")');
      await page.waitForSelector('[role="presentation"]');
      await selectorFunction('div[tabindex="-1"] button:has-text("Enable")');
      
      // reload page and wait loaded
      await waitForElementToDisappear('div[tabindex="-1"]');
      await page.reload();
      await selectorFunction('[data-setting-tab-button="Publish"]');
    }
      
    // publish to web, if necessary
    if(await page.$("span:has-text('Publish to web')")) {
      console.log("Publishing workspace")
      await selectorFunction('button:has(span:has-text("Publish to web"))');
      await selectorFunction('[data-setting-tab-button="Publish"]');

      // reload page and wait loaded
      await page.reload();
      await selectorFunction('[data-setting-tab-button="Publish"]');
    }

    // get workspace public url
    console.log("Getting public URL")
    const input = await page.$('input[value^="app.affine.pro"]');
    const value = await input.evaluate((el) => el.value);
    const PUBLIC_WORKSPACE_URL = value;
    console.log('Finished:')
    console.log(PUBLIC_WORKSPACE_URL);
  }

  async function highlight(selector){
    const element = await page.$(selector);
    await page.evaluate((el) => {
      const div = document.createElement('div');
      div.id = 'highlight';
      div.style.position = 'absolute';
      div.style.border = '2px solid red';
      div.style.zIndex = '9999';
      const rect = el.getBoundingClientRect();
      div.style.left = `${rect.left}px`;
      div.style.top = `${rect.top}px`;
      div.style.width = `${rect.width}px`;
      div.style.height = `${rect.height}px`;
      document.body.appendChild(div);
    }, element);
  }
  
  async function unhighlight(){
    await page.evaluate(() => {
    const highlightDiv = document.querySelector('div[id="highlight"]');
      if (highlightDiv) {
        highlightDiv.remove();
      }
    });
  }
  
  async function selectorFunction(selector, click = true) {

    debug ? console.log(`Waiting for selector ${selector}`) : null
    await page.waitForSelector(selector);
  
    if(debug){
      highlight(selector) 
      console.log(`Highlighting selector ${selector}`)
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`Unhighlight selector ${selector}`)
      await unhighlight()
    }

    if(click) {
      debug ? console.log(`Clicking selector ${selector}`) : null
      await page.click(selector);
    }

    debug ? console.log(`\r\n`) : null

  }

  async function waitForElementToDisappear(selector, timeout = 10000) {
    const endTime = Date.now() + timeout;
  
    while (Date.now() < endTime) {
      const element = await page.$(selector);
      if (!element) {
        return;
      }
  
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  
    //throw new Error(`Timed out waiting for element with selector ${selector}`);
    console.error('AFFiNE Cloud may not have activated, forcing a refresh to try to continue')
    await page.reload();
  }
  
  const processFile = async (fileName) => {
    const filePath = path.join(dirPath, fileName);
    const title = path.parse(fileName).name;
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`Processing file： ${fileName}`);
    await newPage(title, content);
  };

  const processFiles = async () => {
    for (const fileName of files) {
      await processFile(fileName);
    }
  };


})();