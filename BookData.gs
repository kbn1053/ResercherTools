//書籍情報をisbnを基にopenBDから取得

function myFunction_bookdata() {
    
  //ISBNコードがある行の先頭
  var targetCell = "F4"
  
  //現在のシート選択
  var range= SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(targetCell);
  
  //todo ペイロードを減らすため、複数問い合わせに対応
  
  //isbn行を順に探索し、空行になるまで続行する
  //暴走抑止のため最大1000行
  for(var i =0; i<1000;i++){
    
    var isbncode = String(range.offset(i,0).getValue());
    
    //空行で終了
    if(isbncode == ""){
      Logger.log("end");
      break;
    }
    
    //調査済みの行は飛ばす
    var isExistsData = String(range.offset(i,1).getValue());
    if( isExistsData != ""){
      // Logger.log("skip: " + i);
      continue;
    }

    //isbnは整形済みのため入力チェックなし
    
    // OpenBD APIに問い合わせ
    var response = UrlFetchApp.fetch("https://api.openbd.jp/v1/get?isbn=" + isbncode);

    // APIの結果をパース
    var resultJson = JSON.parse(response.getContentText("UTF-8"));
    
    //API異常 or            
    if(resultJson == null || resultJson[0] == null){
      
      // 10桁に変えて再度問い合わせ
      if(isbncode.length == 13)
      {
        isbncode = ResercherTools.toIsbn10(isbncode);        
        response = UrlFetchApp.fetch("https://api.openbd.jp/v1/get?isbn=" + isbncode);
        // APIの結果をパース
        resultJson = JSON.parse(response.getContentText("UTF-8"));
      }
      
      if(resultJson == null || resultJson[0] == null){
        range.offset(i,1).setValue("No Book Data or API Error");
        continue;
      }  
    }
    
    //title書き込み
    range.offset(i,1).setValue(resultJson[0].summary.title);
    
    //author書き込み
    range.offset(i,2).setValue(resultJson[0].summary.author);
    
    //publisher書き込み
    range.offset(i,3).setValue(resultJson[0].summary.publisher);
    
    //pubdate書き込み
    range.offset(i,4).setValue(resultJson[0].summary.pubdate);
    
    //cover書き込み //利用しないので無効化
    //range.offset(i,5).setValue(resultJson[0].summary.cover);
    
  } 
}

