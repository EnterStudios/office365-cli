import commands from '../../commands';
import Command, { CommandValidate, CommandOption, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth, { Site } from '../../SpoAuth';
const command: Command = require('./folder-get');
import * as assert from 'assert';
import * as request from 'request-promise-native';
import Utils from '../../../../Utils';

describe(commands.FOLDER_GET, () => {
  let vorpal: Vorpal;
  let log: any[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;
  let stubGetResponses: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });

    stubGetResponses = (getResp = null) => {
      return sinon.stub(request, 'get').callsFake((opts) => {
        if (opts.url.indexOf('GetFolderByServerRelativeUrl') > -1) {
          if (getResp) {
            return getResp;
          } else {
            return Promise.resolve({ "Exists": true, "IsWOPIEnabled": false, "ItemCount": 0, "Name": "test1", "ProgID": null, "ServerRelativeUrl": "/sites/test1/Shared Documents/test1", "TimeCreated": "2018-05-02T23:21:45Z", "TimeLastModified": "2018-05-02T23:21:45Z", "UniqueId": "0ac3da45-cacf-4c31-9b38-9ef3697d5a66", "WelcomePage": "" });
          }
        }
  
        return Promise.reject('Invalid request');
      });
    }
  });

  beforeEach(() => {
    vorpal = require('../../../../vorpal-init');
    log = [];
    cmdInstance = {
      log: (msg: string) => {
        log.push(msg);
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
    auth.site = new Site();
    telemetry = null;
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.get
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.getAccessToken,
      auth.restoreAuth,
      request.get
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.FOLDER_GET), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('calls telemetry', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert(trackEvent.called);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs correct telemetry event', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert.equal(telemetry.name, commands.FOLDER_GET);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not connected to a SharePoint site', (done) => {
    auth.site = new Site();
    auth.site.connected = false;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', folderUrl: '/Shared Documents' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Connect to a SharePoint Online site first')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('should correctly handle folder get reject request', (done) => {
    stubGetResponses(new Promise((resolve, reject) => { reject('error1'); }));

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();

    cmdInstance.action({
      options: {
        webUrl: 'https://contoso.sharepoint.com',
        folderUrl: '/Shared Documents',
      }
    }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('error1')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('should show tip when folder get rejects with error code 500', (done) => {
    sinon.stub(request, 'get').rejects({ statusCode: 500 });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();

    cmdInstance.action({
      options: {
        webUrl: 'https://contoso.sharepoint.com',
        folderUrl: '/Shared Documents',
      }
    }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Please check the folder URL. Folder might not exist on the specified URL')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('should correctly handle folder get success request', (done) => {
    stubGetResponses();

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();

    cmdInstance.action({
      options: {
        debug: true,
        webUrl: 'https://contoso.sharepoint.com',
        folderUrl: '/Shared Documents',
      }
    }, () => {

      try {
        assert(cmdInstanceLogSpy.lastCall.calledWith({ "Exists": true, "IsWOPIEnabled": false, "ItemCount": 0, "Name": "test1", "ProgID": null, "ServerRelativeUrl": "/sites/test1/Shared Documents/test1", "TimeCreated": "2018-05-02T23:21:45Z", "TimeLastModified": "2018-05-02T23:21:45Z", "UniqueId": "0ac3da45-cacf-4c31-9b38-9ef3697d5a66", "WelcomePage": "" }));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('should pass the correct url params to request', (done) => {
    const request = stubGetResponses();

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();

    cmdInstance.action({
      options: {
        debug: false,
        output: 'json',
        webUrl: 'https://contoso.sharepoint.com',
        folderUrl: '/Shared Documents',
      }
    }, () => {

      try {
        const lastCall: any = request.lastCall.args[0];
        assert.equal(lastCall.url, 'https://contoso.sharepoint.com/_api/web/GetFolderByServerRelativeUrl(\'%2FShared%20Documents\')');
        assert.equal(lastCall.headers.authorization, 'Bearer ABC');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('should pass the correct url params to request (sites/test1)', (done) => {
    const request = stubGetResponses();

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com/sites/test1';
    cmdInstance.action = command.action();

    cmdInstance.action({
      options: {
        debug: false,
        output: 'json',
        webUrl: 'https://contoso.sharepoint.com/sites/test1',
        folderUrl: 'Shared Documents/',
      }
    }, () => {

      try {
        const lastCall: any = request.lastCall.args[0];
        assert.equal(lastCall.url, 'https://contoso.sharepoint.com/sites/test1/_api/web/GetFolderByServerRelativeUrl(\'%2Fsites%2Ftest1%2FShared%20Documents\')');
        assert.equal(lastCall.headers.authorization, 'Bearer ABC');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  

  it('supports debug mode', () => {
    const options = (command.options() as CommandOption[]);
    let containsDebugOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsDebugOption = true;
      }
    });
    assert(containsDebugOption);
  });

  it('supports specifying URL', () => {
    const options = (command.options() as CommandOption[]);
    let containsTypeOption = false;
    options.forEach(o => {
      if (o.option.indexOf('<webUrl>') > -1) {
        containsTypeOption = true;
      }
    });
    assert(containsTypeOption);
  });

  it('fails validation if the webUrl option not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { folderUrl: '/Shared Documents' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if the webUrl option is not a valid SharePoint site URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'foo', folderUrl: '/Shared Documents' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if the webUrl option is a valid SharePoint site URL and folderUrl specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', folderUrl: '/Shared Documents' } });
    assert.equal(actual, true);
  });

  it('fails validation if the folderUrl option not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com' } });
    assert.notEqual(actual, true);
  });

  it('has help referring to the right command', () => {
    const cmd: any = {
      log: (msg: string) => { },
      prompt: () => { },
      helpInformation: () => { }
    };
    const find = sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    assert(find.calledWith(commands.FOLDER_GET));
  });

  it('has help with examples', () => {
    const _log: string[] = [];
    const cmd: any = {
      log: (msg: string) => {
        _log.push(msg);
      },
      prompt: () => { },
      helpInformation: () => { }
    };
    sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    let containsExamples: boolean = false;
    _log.forEach(l => {
      if (l && l.indexOf('Examples:') > -1) {
        containsExamples = true;
      }
    });
    Utils.restore(vorpal.find);
    assert(containsExamples);
  });

  it('correctly handles lack of valid access token', (done) => {
    Utils.restore(auth.getAccessToken);
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.reject(new Error('Error getting access token')); });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        webUrl: "https://contoso.sharepoint.com",
        folderUrl: '/Shared Documents',
        debug: false
      }
    }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Error getting access token')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });
});