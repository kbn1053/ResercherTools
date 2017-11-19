//蔵書取得処理

function myFunction_zousyo(mode_str) {
  
  Logger.log("start"); 
  
  //処理モード
  var isRetryMode = false;
  if(mode_str === "retry")
  {
    var isRetryMode = true;
  }    
  
  //APIKeyを設定
  var myAPIkey = ResercherTools.getMyCalilApiKey();
  
  //var maxSyosekiRequest = 100; // 最大検索数 // 制約：1セッション当たりの書籍リクエストが100
  var maxSyosekiRequest = 99; // 最大検索数 // 制約：1セッション当たりの書籍リクエストが100  // debug
  
  var maxId = 100; // 重複ありの最大systemId数 // todo 微妙 fixme
  var maxTotalId = 10; // 重複なしの最大systemId数 // 制約 isbn * systemid <= 1000を満たさなければならない
  var maxIsbn = 100; // 最大検索数 1000count / hourのため 1000 / maxTotalId = 100

  // 各種データ読み出し位置
  var isbnCell = "F4"; //
  var systemIdCell = "L1";
  var resumeCell = "C12";
  
  // データ書き出し位置
  var writeCell ="L4";
  var calilUrlCell = "S4";
  
  // 処理タイムアウト時間
  var apiTimeout = ResercherTools.getScriptTimeout();
  // APIポーリング間隔
  var apiWait = ResercherTools.getCalilApiWait();
  //リトライ回数
  var retryCount = Math.floor(apiTimeout / apiWait);
  
  // シートから読みだしたisbn列(13桁正規化済み)
  var isbnList_all = new Array(); // 全体
  var isbnList_request = new Array(); // 所蔵情報取得前のisbn

  //systemIdList構造 : systemIdと図書館キーと書き込み位置（オフセット）を紐づけるオブジェクト
  // systemIdList{
  //  systemid1{
  //   toshokan_key_A : write_offset(スプレッドシート書き出し位置のオフセット情報),
  //   toshokan_key_B : write_offset(書き出し位置のオフセット情報),
  //   ・・・・
  //   toshokan_key_N : write_offset(書き出し位置のオフセット情報)},
  //  systemid2{・・・・},
  //   ・・・・
  //  systemidn{・・・・}}
  
  var systemIdList = new Object(); 
  
  ///////main処理////// 
  collectionIsbn(isbnCell,isbnList_all,isbnList_request,maxIsbn);
  collectionSystemId(systemIdCell,systemIdList,maxId);
  
  //1クエリ100書籍カウントのAPI制限を満たすため、isbn数を制限する
  var isbnList_limited = calcQueryIsbnLIst(systemIdList,maxSyosekiRequest,isbnList_request); 

  //APIcall
  var resultJson = new Object();
  if(isRetryMode == true){
    resultJson = callApi_resume(myAPIkey,apiWait,retryCount,resumeCell);
  }  
  else{
    //query組み立て
    var query = buildQueryUrl(myAPIkey,isbnList_limited,systemIdList);
    resultJson = callApi(query,myAPIkey,apiWait,retryCount,resumeCell);
  }

  //debug
  //Logger.log(resultJson);
  
  if (resultJson != null){
    //シートに書きこみ処理
    setValues(resultJson,isbnList_all,isbnList_limited,systemIdList,writeCell,calilUrlCell);
    
    //calilAPI利用制約:API結果表示時はisbnでリンクを張ること
    //setCalilUrls(calilUrlCell,isbnList_all);
  }
  
  //各種Alert表示
  if( isbnList_request.length > isbnlimit){
    Browser.msgBox("所蔵問い合わせが多すぎるので、最大数で問い合わせました。\n残りは再度問い合わせしてください。");
  }
  if( resultJson == null){
    Browser.msgBox("カーリルでの処理が時間がかかっています。★リサーチャーツールからリトライを実行してください。");
  }
  
  Logger.log("end");
  
  return;  
}

function collectionIsbn(isbncell,isbnlist_all,isbnlist_request,isbnmax){
  
  Logger.log("call callectionIsbn");  
 
  //isbnリスト作成
  //全リストと問い合わせ大賞リストの2つを作る
  // 1セッション当たりの問い合わせ数に制限があるため、制限以下は実施しない。
  var isbnrange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(isbncell);
  for( i = 0 ;i <isbnmax;i++){
    
    var temp = isbnrange.offset(i,0).getValue()
    
    //空行で終了
    if(temp == ""){
      Logger.log("List end: count " + i );
      break;
    }
    
    //isbnリストに追加
    isbnlist_all.push(temp);
    
    // 所蔵状態セルが空白ならば、問い合わせ必要
    var temp2 = isbnrange.offset(i,6).getValue();
    if(temp2 == ""){
      isbnlist_request.push(temp);
    }
  }
  
  //todo 重複があった時の処理 // 悪影響無いのでは？放置
  
  return;
}

function collectionSystemId(systemidcell,systemidlist,maxid){
  
  Logger.log("call collectionSystemId");
  
  //systemIdリスト作成（重複を許容しない）
  var systemIdrange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(systemidcell);
  for( i = 0 ;i < maxid;i++){
    var temp_systemid = systemIdrange.offset(0,i).getValue()

    //空行で終了
    if(temp_systemid == ""){
      Logger.log("List end: count " + i );
      break;
    }    
    
    //図書館キーを取得
    var temp_toshokey = systemIdrange.offset(1,i).getValue()
   
    //systemidが存在する
    if(systemidlist.hasOwnProperty(temp_systemid)){
      var temp_obj = systemidlist[temp_systemid];
      temp_obj[temp_toshokey] = i;// 図書館キーとオフセット位置のペア作成
    }
    else{
      var temp_obj = new Object();
      temp_obj[temp_toshokey] = i;// 図書館キーとオフセット位置のペア作成
      systemidlist[temp_systemid] = temp_obj;
    }
  }  
  
  //todo total id数チェック
  Logger.log(systemidlist);
    
  return;
}

function calcQueryIsbnLIst(systemidlist,maxshosekirequest,isbnlist_request){
  
  //API制約:1つのセッションでは100書籍リクエストに抑えなければならない
  var systemidcount = Object.keys(systemidlist).length;
  var isbnlimit = Math.floor(maxshosekirequest / systemidcount);
  
  //問い合わせ制限があるため最大数以上は削除
  var isbnlist_limited = isbnlist_request.slice(0,isbnlimit);
 
  return isbnlist_limited;
}
 
function buildQueryUrl(myapikey,isbnlist_limited,systemidlist){
  
  Logger.log("start buildQueryUrl");
  
  var systemid_str = "";
  
  for(var k in systemidlist){
    systemid_str += k + ",";
  }
  systemid_str = systemid_str.slice( 0, -1); // 余計な,を削除

  var isbn_str = isbnlist_limited.join(",");
  
  var temp_query = "https://api.calil.jp/check?appkey=" + myapikey + "&isbn=" + isbn_str + "&systemid=" + systemid_str + "&format=json&callback=no";
  Logger.log(temp_query);
  
  Logger.log("end");
  
  return temp_query;
}

function callApi(q,apikey,apiwait,retrycount,resumecell){
  
  Logger.log("call API");
  
  //戻り値
  var result = new Object();
  
  var resumerange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(resumecell);
  
  // カーリル 図書館APIに問い合わせ
  var response = UrlFetchApp.fetch(q,{ muteHttpExceptions:true });
  var responsecode = response.getResponseCode();
  
  Logger.log("responsecode : " + responsecode);
  
  if(responsecode == 200){
   
    // APIの結果をパース
    result = JSON.parse(response.getContentText("UTF-8"));
    
    if( result["continue"] == 1 )
    {
      var retry_query = "https://api.calil.jp/check?appkey=" + apikey + "&session=" + result.session + "&format=json&callback=no";
      
      result = checkApi(retry_query,retrycount,apiwait,resumerange);
      
      //結局終わらずにタイムアウトした場合
      if( result["continue"] == 1 ){
        //セッションIDを保存
        resumerange.offset(0,0).setValue(result.session);
        Logger.log("timeout : session = " + result.session);
        
        result = null;
      }
    }  
  }else{
    // ステータスコードが200でない場合は停止
    result = null;
  }
    
  Logger.log("end API");
  
  return result;
}

function callApi_resume(apikey,apiwait,retrycount,resumecell){
  Logger.log("call API");
  
  //戻り値
  var result = new Object();
  
  var resumerange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(resumecell);
  var sessionId = resumerange.offset(0,0).getValue();
  if( sessionId == ""){
    Logger.log("no session id");
    result = null; 
  }
  
  var retry_query = "https://api.calil.jp/check?appkey=" + apikey + "&session=" + sessionId + "&format=json&callback=no";
  Logger.log(retry_query);
  
  result = checkApi(retry_query,retrycount,apiwait,resumerange);  
  
  Logger.log("end API");
  
  return result;
  
}

function checkApi(query,retrycount,apiwait,resumerenge){
  
  Logger.log("checkApi");
  
  var result = new Object();
  
  for( var i=0;i<retrycount;i++){ 
    Logger.log("Retry : " + (i+1) );
    
    //apiを呼び出す前に待つ
    Utilities.sleep(apiwait);
    
    // カーリル 図書館APIに問い合わせ(ポーリング)
    var response = UrlFetchApp.fetch(query,{ muteHttpExceptions:true });
    var responsecode = response.getResponseCode();
    Logger.log("responsecode : " + responsecode);  
    
    if( responsecode != 200){
      // サーバーがおかしいのでポーリング打ち切り。前回のポーリング結果を返す。
      Logger.log("retry force end");
      break;
    }
    
    result = JSON.parse(response.getContentText("UTF-8"));
    
    resumerenge.offset(0,0).setValue(result.session);
    
    if( result["continue"] == 0 ){
      Logger.log("retry end");
      break;
    }
  }
  
  Logger.log("checkApi end");
  
  return result;
}


function setValues(resultjson,isbnlist_all,isbnlist_limited,systemidlist,writecell,calilurlcell){
  
  Logger.log("set values");
  
  // 貸し出し中ステータス
  var kashidashi_status = {
    ok : "貸出可",
    exists : "蔵書あり",
    limit : "館内のみ",
    rent : "貸出中",
    reserv : "予約中",
    before : "準備中",
    holiday : "休館中",
    no : "蔵書なし"
  }
  
  var writerange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(writecell);
  var calilurlrenge = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(calilurlcell);
  
  //データ書き込み
  for(var i=0;i < isbnlist_all.length;i++){
    
    var isbn = isbnlist_all[i];
    Logger.log(isbn);
    
    //リクエストしていないisbnは対象外として次に飛ばす
    if(isbnlist_limited.indexOf(isbn) < 0){
      Logger.log(isbn + " is passed");
      continue;
    }
    
    //カーリルURL書き出し
    setCalilUrls(isbn,calilurlrenge);

    for(var systemid in systemidlist){
      
      Logger.log(systemid);
      // 図書館システム以下の図書館キーを取得
      var tosho_keys = systemidlist[systemid];
      
      var json_systemid = resultjson.books[isbn][systemid];

      //jsondataにsystemidが含まれないパターン(相手の図書館システム応答なし)
      if(json_systemid == null){
        Logger.log("systemid noreturn");
        temp_kasidashi_status = kashidashi_status.no; // todo 何か知らんがjsonデータに含まれていないことがある。
        
        for( var k in tosho_keys){
          var retu_offset = tosho_keys[k];
          writerange.offset(i,retu_offset).setValue(temp_kasidashi_status);
        }        
        continue;
      }
      
      //jsonデータの格納
      var db_status = json_systemid.status;
      // var db_reserveurl = json_systemid.reserveurl; // notuse
      var db_libkey = json_systemid.libkey;
      
      //Logger.log("db status:" + db_status);
      //Logger.log("db libkey:" + db_libkey);
      
      // 図書館システムがエラーまたはタイムアウト時間を超えて処理中
      // このisbn処理結果に異常を書きこむ、次の図書館システムへ行く
      if(json_systemid.status === "Error" || json_systemid.status === "Running"){
        Logger.log("db status:" + db_status);
        
        for( var k in tosho_keys){
          var retu_offset = tosho_keys[k];
          writerange.offset(i,retu_offset).setValue(json_systemid.status);
        }
        
      }else{
        //正常時
        for(var toshokey in tosho_keys){
          
          Logger.log(toshokey);
          var retu_offset = tosho_keys[toshokey];
          var temp_kasidashi_status = "";
          
          if(db_libkey.hasOwnProperty(toshokey)){
            temp_kasidashi_status = db_libkey[toshokey];
          }
          else{
            temp_kasidashi_status = kashidashi_status.no;
          }
          
          Logger.log("status :" + temp_kasidashi_status);
          
          //書き込み
          writerange.offset(i,retu_offset).setValue(temp_kasidashi_status);
        }
      }
    }    
  }
  
  Logger.log("end setValues");
  
  return;
}

function setCalilUrls(isbncode,calilurlrenge){
  //カーリルURLを書き出し
  //isbn10に変更
  if(isbncode.length == 13){
    isbncode = ResercherTools.toIsbn10(isbncode);
  }
  
  var url = "http://calil.jp/book/" + isbncode;
  
  calilurlrenge.offset(i,0).setValue(url); 
}