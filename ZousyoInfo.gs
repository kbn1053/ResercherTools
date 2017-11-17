//蔵書取得処理

function myFunction_syozou() {
  
  Logger.log("start");
  
  //APIKeyを設定
  var myAPIkey = ResercherTools.getMyCalilApiKey();
  
  var maxIsbn = 100; // 最大検索数 // 制約：API制限が1000図書問い合わせ/h
  var maxId = 100; // 重複ありの最大systemId数
  var maxTotalId = 10; // 重複なしの最大systemId数 // 制約 isbn * systemid <= 1000を満たさなければならない

  // 各種データ読み出し位置
  var isbnCell = "F4"; //
  var systemIdCell = "L1";
  var resumeCell = "C12";
  
  // データ書き出し位置
  var writeCell ="L4";
  var calilUrlCell = "S4";
  
  // 処理タイムアウト時間(240sec)
  var apiTimeout = 240000;
  // APIポーリング間隔:制約(2sec未満は禁止):余裕を見て5secでリトライ
  var apiWait = 5000;
  //リトライ回数
  var retryCount = apiTimeout / apiWait;
  
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
  
  //query組み立て
  var query = buildQueryUrl(myAPIkey,isbnList_request,systemIdList);

  //APIcall
  var resultJson = callApi(query,myAPIkey,apiWait,retryCount,resumeCell);

  //debug
  //Logger.log(resultJson);
  
  setValues(resultJson,isbnList_all,isbnList_request,systemIdList,writeCell);
  
  //calilAPI利用制約:API結果表示時はisbnでリンクを張ること
  setCalilUrls(calilUrlCell,isbnList_all);
  
  Logger.log("end");
  
}

function collectionIsbn(isbncell,isbnlist_all,isbnlist_request,maxIsbn){
  
  Logger.log("call callectionIsbn"); 
  
  //isbnリスト作成
  var isbnrange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(isbncell);
  for( i = 0 ;i <maxIsbn;i++){
    
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
  
  //todo isbnではない値の処理
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

function buildQueryUrl(myapikey,isbnlist_request,systemidlist){
  
  Logger.log("start buildQueryUrl");
  
  var systemid_str = "";
  
  for(var k in systemidlist){
    systemid_str += k + ",";
  }
  systemid_str = systemid_str.slice( 0, -1); // 余計な,を削除
  
  var isbn_str = isbnlist_request.join(",");
  
  var temp_query = "https://api.calil.jp/check?appkey=" + myapikey + "&isbn=" + isbn_str + "&systemid=" + systemid_str + "&format=json&callback=no";
  
  Logger.log(temp_query);
  
  Logger.log("end");
  
  return temp_query;
}

function callApi(q,apikey,apiwait,retrycount,resumecell){
  
  Logger.log("call API");
  
  var resumerange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(resumecell);
  
  // カーリル 図書館APIに問い合わせ
  var response = UrlFetchApp.fetch(q);
    
  // APIの結果をパース
  var result = JSON.parse(response.getContentText("UTF-8"));
  
  if( result["continue"] == 1 )
  {
    for( var i=0;i<retrycount;i++){ 
      Logger.log("Retry : " + (i+1) );
      
      //apiを呼び出す前に待つ
      Utilities.sleep(apiwait);
      
      // カーリル 図書館APIに問い合わせ(ポーリング)
      var response = UrlFetchApp.fetch("https://api.calil.jp/check?appkey=" + apikey + "&session=" + result.session + "&format=json&callback=no");
      result = JSON.parse(response.getContentText("UTF-8"));
      
      resumerange.offset(0,0).setvalue(result.session);
      
      if( result["continue"] == 0 ){
        Logger.log("retry end");
        break;
      }
    }
    
    //結局終わらずにタイムアウトした場合
    if( result["continue"] == 1 ){
      //セッションIDを保存
      resumerange.offset(0,0).setvalue(result.session);
      Logger.log("timeout : session = " + result.session);
    }
  }
    
  Logger.log("end API");
  
  return result;
}


function setValues(resultjson,isbnlist_all,isbnlist_request,systemidlist,writecell){
  
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
  
  //データ書き込み
  for(var i=0;i < isbnlist_all.length;i++){
    
    var isbn = isbnlist_all[i];
    Logger.log(isbn);
    
    //リクエストしていないisbnは対象外として次に飛ばす
    if(isbnlist_request.indexOf(isbn) == -1){
      Logger.log(isbn + " is passed");
      continue;
    }

    for(var systemid in systemidlist){
      
      Logger.log(systemid);
      
      var json_systemid = resultjson.books[isbn][systemid];

      //値がないなら次へ
      if(json_systemid == null){
        continue;
      }
      
      //jsonデータの格納
      var db_status = json_systemid.status;
      // var db_reserveurl = json_systemid.reserveurl; // notuse
      var db_libkey = json_systemid.libkey;
      
      //Logger.log("db status:" + db_status);
      //Logger.log("db libkey:" + db_libkey);
      
      // 図書館システム以下の図書館キーを取得
      var tosho_keys = systemidlist[systemid];
      
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

function setCalilUrls(calilurlcell,isbnlist_all){
  
  var writerange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(calilurlcell);
  
  for(var i=0; i < isbnlist_all.length;i++){
    
    var isbncode = String(isbnlist_all[i]);
    
    //isbn10に変更
    if(isbncode.length == 13){
      isbncode = ResercherTools.toIsbn10(isbncode);
    }
    
    var url = "http://calil.jp/book/" + isbncode;
    
    writerange.offset(i,0).setValue(url);
  }
  
}