// 個人設定を保存する

function getMyCalilApiKey() {
  
  //カーリルから取得したAPIキーを入力する
  var myApiKey = "";
  
  return myApiKey;
  
}

function getScriptTimeout() {
  
  //処理のタイムアウト時間(ms)
  //6min=360sec= 360000msでGAS自体が強制終了するらしい
  var myScriptTimeout = "240000";
  
  return myScriptTimeout;
  
}

function getCalilApiWait() {
  
  //Calilへの問い合わせ間隔
  //仕様上2sec以上開ける必要がある
  //違反すると、しばらくの間（1hour?)APIが500errorを返すようになる
  var myApiWait = "10000";
  
  return myApiWait;
  
}