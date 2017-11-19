//ISBNをハイフンなし13桁に正規化

function myFunction_isbnfix() {
  
  var isbn_all = [];
  
  //ISBNコードがある行の先頭
  var targetCell = "F4"
  
  //現在のシート選択
  var range= SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(targetCell);
  
  //isbn行を順に探索し、空行になるまで続行する
  //暴走抑止のため最大1000行
  for(var i =0; i<1000;i++){
    
    var isbncode = String(range.offset(i,0).getValue());
    
    //空行で終了
    if(isbncode == ""){
      Logger.log("end");
      break;
    }
    
    //ハイフンを削除
    isbncode = isbncode.replace( /-/ ,"");
    
    //isbn桁数チェック
    // 有効桁数: ハイフンなし13桁 / 10桁
    var isbnLen = isbncode.length;
    if(isbnLen != 13 && isbnLen != 10){
      Logger.log("non isbn");
      range.offset(i,1).setValue("ISBN CODE Error(length?)");
      continue;
    }
    
    //isbn使用文字チェック 数字以外は許可しない
    var isbnJudge = isbncode.search( /^[0-9]+$/ );
    //Logger.log("judge:" + isbnJudge);
    if( isbnJudge == -1){
      Logger.log("non isbn");
      range.offset(i,1).setValue("ISBN CODE Error(value?)");
      continue;
    }
    
    //isbn10桁の場合は13桁にする
    if(isbnLen == 10){
      isbncode = ResercherTools.toIsbn13(isbncode);
    }
    
    //重複チェック
    if(isbn_all.indexOf(isbncode) <0 )
    {
      // ハイフンなし13桁のコードで書きこむ
      range.offset(i,0).setValue(isbncode); 
    }else{
      range.offset(i,1).setValue("ISBN CODE 重複してます");
    }
  }  
}
