//図書館情報取得

function myFunction_toshokan() {
  
  //APIKeyを設定
  var myAPIkey = ResercherTools.getMyCalilApiKey();
    
  //県名がある行の先頭
  var targetCell = "C3";
  //var cityCell = "C4";
  
  //データ書き出しセルの先頭
  var writeCell = "B9";
  var tenkiCell = "G2"; //文献調査シートへの転記用
  
  //現在のシート選択
  var tagetrange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(targetCell);
  var writerange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(writeCell);
  var tenkirange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(tenkiCell);
  
  //todo 複数県調査 // 対応しない
  
  var prefname = String(tagetrange.offset(0,0).getValue());
  var cityname = String(tagetrange.offset(1,0).getValue());
  
  //todo 入力チェック
  
  Logger.log("start");
  
  // カーリル 図書館APIに問い合わせ // todo 一括問い合わせ
  var response = UrlFetchApp.fetch("https://api.calil.jp/library?appkey=" + myAPIkey + "&pref=" + prefname + "&city=" + cityname + "&format=json&callback=");

  // APIの結果をパース
  var resultJson = JSON.parse(response.getContentText("UTF-8"));
  
  if( resultJson != null){   
    for(var i=0;i < resultJson.length; i++){
      
      Logger.log(resultJson[i].systemid);
      
      //詳細書き出し
      writerange.offset(i,0).setValue(i+1);
      
      writerange.offset(i,1).setValue(resultJson[i].systemid);
      writerange.offset(i,2).setValue(resultJson[i].systemname);
      
      writerange.offset(i,3).setValue(resultJson[i].libkey);
      writerange.offset(i,4).setValue(resultJson[i].libid);
      
      writerange.offset(i,5).setValue(resultJson[i].short);
      writerange.offset(i,6).setValue(resultJson[i].formal);
      writerange.offset(i,7).setValue(resultJson[i].url_pc);
      
      writerange.offset(i,8).setValue(resultJson[i].address);
      writerange.offset(i,9).setValue(resultJson[i].pref);
      writerange.offset(i,10).setValue(resultJson[i].city);
      
      writerange.offset(i,11).setValue(resultJson[i].post);
      writerange.offset(i,12).setValue(resultJson[i].tel);
      writerange.offset(i,13).setValue(resultJson[i].geocode);
      
      writerange.offset(i,14).setValue(resultJson[i].category);
      
      // not use
      //writerange.offset(i,15).setValue(resultJson[i].image);
      //writerange.offset(i,16).setValue(resultJson[i].distance);
      
      var calil_liburl = "http://calil.jp/library/search?s=" + resultJson[i].systemid + "&k=" + resultJson[i].libkey;
      
      writerange.offset(i,17).setValue(calil_liburl);
      
      //転記用
      tenkirange.offset(0,i).setValue(i+1);
      tenkirange.offset(1,i).setValue(resultJson[i].systemid);
      tenkirange.offset(2,i).setValue(resultJson[i].libkey);
      tenkirange.offset(3,i).setValue(resultJson[i].short);
      
    }
  }
  else{
    Logger.log("jsondata is null");
  }
  
  Logger.log("end");
}
