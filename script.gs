function startCopy() {
  // 輸入要複製的目錄 ID
  var sourceid = '1NN5YQeRPX-KawaaeqnUtv3e2vXs-zhij';
  // 輸入目標的目錄 ID
  var targetid = '1yfdahAxhXwe6XK4lA_nNFatnORIbGK23';
  
  source = DriveApp.getFolderById(sourceid)
  target = DriveApp.getFolderById(targetid);
  
  // Copy the top level files
  copyFiles(source, target);
  
  // Now set the subdirectories to process
  var subfolders = source.getFolders()
  var continuationToken = subfolders.getContinuationToken();
  
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('COPY_FILES_CONTINUATION_TOKEN', continuationToken);
  userProperties.setProperty('COPY_FILES_BASE_TARGET_FOLDER_ID', targetid);
  
  // Set the trigger to start after 20 seconds - will allow the webapp portion to complete
  ScriptApp.newTrigger("resume")
   .timeBased()
   .after(50000)
   .create();
}


// Copies the files from sfolder to dfolder
function copyFiles(sfolder, dfolder) {
  var files = sfolder.getFiles();
  var file;
  var fname;
  
  var totalsfiles = countFiles(sfolder);
  if(totalsfiles < 300){
    var totaltfiles = countFiles(dfolder);
    if(totalsfiles == totaltfiles){
      console.info('來源('+totalsfiles+')與目標('+totaltfiles+')檔案數量相同，略過資料夾 '+sfolder);
      return;
    }
  }

  while(files.hasNext()) {
    file = files.next();
    fname = file.getName();
    if(dfolder.getFilesByName(fname).hasNext() === false){
      console.info('複製檔案：' + fname);
      file.makeCopy(fname, dfolder);
    }
  }
}

// Copies the files and folders
function copyFolder(sfolder, dfolder) {
  var dir;
  var newdir;
  
  copyFiles(sfolder, dfolder)
  
  var dirs = sfolder.getFolders();
  while(dirs.hasNext()) {
    dir = dirs.next();
    if(dfolder.getFoldersByName(dir.getName()).hasNext() === false){
      newdir = dfolder.createFolder(dir.getName());
      console.info('建立資料夾：'+dir.getName());
    }else{
      newdir = dfolder.getFoldersByName(dir.getName()).next();
      console.info('檢查資料夾：'+dir.getName());
    }
    copyFolder(dir, newdir);
  }
}


// Resume the copy
function resume(e) {
  
  var userProperties = PropertiesService.getUserProperties();
  var continuationToken = userProperties.getProperty('COPY_FILES_CONTINUATION_TOKEN');
  var baseTargetFolderId = userProperties.getProperty('COPY_FILES_BASE_TARGET_FOLDER_ID');
  var dir;
  var newdir;
 
  // Clear any existing triggers
  removeTriggers();
  
  // We're finished
  if(continuationToken == null) {
    console.info('複製完畢');
    return null; 
  }
  
  // Install a trigger in case we timeout or have a problem
  ScriptApp.newTrigger("resume")
   .timeBased()
   .after(31 * 60 * 1000)
   .create();  

  var subfolders = DriveApp.continueFolderIterator(continuationToken);
  var dfolder = DriveApp.getFolderById(baseTargetFolderId);

  while(subfolders.hasNext()) {    
    var continuationToken = subfolders.getContinuationToken();
    userProperties.setProperty('COPY_FILES_CONTINUATION_TOKEN', continuationToken);    

    dir = subfolders.next();
    //newdir = dfolder.createFolder(dir.getName());
    if(dfolder.getFoldersByName(dir.getName()).hasNext() === false){
      newdir = dfolder.createFolder(dir.getName());
      console.info('建立資料夾：'+dir.getName());
    }else{
      newdir = dfolder.getFoldersByName(dir.getName()).next();
      console.info('檢查資料夾：'+dir.getName());
    }
    
    copyFolder(dir, newdir);
  }
  
  // Clean up - we're done
  userProperties.deleteAllProperties();
  removeTriggers();
  
  // Send confirmation mail
  var email = Session.getActiveUser().getEmail();
  MailApp.sendEmail(email, "複製完畢",
                   "檔案已全部複製完畢。"); 
}

function removeTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    console.info('stop '+allTriggers[i]);
    ScriptApp.deleteTrigger(allTriggers[i]);
  }   
}

function countFiles(folder){
  var count,file,files;
  files = folder.getFiles();
  count = 0;
  while(files.hasNext()){
    count++;
    file = files.next();
    if(count>300){
      return count;
    }
  }
  return count;
}
