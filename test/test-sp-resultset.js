var common = require("./common")
  , ibmdb = require("../")
  , assert = require("assert")
  , schema = common.connectionObject.CURRENTSCHEMA;

if(schema == undefined) schema = "NEWTON";

//==================== TEST 1 =============================
console.log("==================== TEST 1 =============================\n");

var proc1 = "create or replace procedure " + schema + ".PROC2 ( IN v1 int, INOUT v2 varchar(30) )  dynamic result sets 2 language sql begin  declare cr1  cursor with return for select c1, c2 from " + schema + ".mytab1; declare cr2  cursor with return for select c2 from " + schema + ".mytab1; open cr1; open cr2; set v2 = 'success'; end";
var proc2 = "create or replace procedure " + schema + ".PROC2 ( IN v1 int, INOUT v2 varchar(30) )  language sql begin  set v2 = 'success'; end";
var proc3 = "create or replace procedure " + schema + ".PROC2 ( IN v1 int, IN v2 varchar(30) )  dynamic result sets 2 language sql begin  declare cr1  cursor with return for select c1, c2 from " + schema + ".mytab1; declare cr2  cursor with return for select c2 from " + schema + ".mytab1; open cr1; open cr2; end";
var query = "call " + schema + ".PROC2(?, ?)";

if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
  // Update the queries for Db2 on z/OS compatiability.
  // - Does not support CREATE OR REPLACE syntax.
 var dropProc = "drop procedure " + schema + ".PROC2";
  proc1 = proc1.replace(" or replace", "");
  proc2 = proc2.replace(" or replace", "");
  proc3 = proc3.replace(" or replace", "");

  // - When creating an SQL native procedure on z/OS, you will need to have a WLM environment
  // defined for your system if you want to run the procedure in debugging mode. Adding
  // "disable debug mode" to bypass this requirement.
  proc1 = proc1.replace(" begin", " disable debug mode begin");
  proc2 = proc2.replace(" begin", " disable debug mode begin");
  proc3 = proc3.replace(" begin", " disable debug mode begin");
}
var result;
ibmdb.open(common.connectionString, {fetchMode : 3}, function (err, conn) {
    if(err) {
      console.log(err);
      process.exit(-1);
    }
    try {
      conn.querySync({"sql":"create table " + schema + ".mytab1 (c1 int, c2 varchar(20))", "noResults":true});
    } catch (e) {};

    if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
      // Db2 on z/OS does not support multi-row inserts
      conn.querySync("insert into " + schema + ".mytab1 values (2, 'bimal')");
      conn.querySync("insert into " + schema + ".mytab1 values (3, 'kumar')");
    } else {
      conn.querySync("insert into " + schema + ".mytab1 values (2, 'bimal'), (3, 'kumar')");
    }
    param2 = {ParamType:"INOUT", DataType:1, Data:"abc", Length:50};

    // Create SP with INOUT param and 2 Result Set.
    if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
      // CREATE OR REPLACE is not supported on z/OS.  Explicitly drop procedure.
      try {
         conn.querySync(dropProc);
      } catch(e) { };
    }
    conn.querySync(proc1);

    // Call SP Synchronously.
    result = conn.querySync(query, [1, param2]);
    console.log("Result for Sync call of proc1 ==>");
    console.log(result);
    assert.equal(result.length, 3);
    // Call SP Asynchronously.
    conn.query(query, [1, param2], function (err, result) {
        if (err) console.log(err);
        else {
          console.log("Result for Async call of proc1 ==>");
          console.log(result);
          assert.equal(result.length, 3);
        }

        // Create SP with only OUT param and no resultset.
        if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
          // CREATE OR REPLACE is not supported on z/OS.  Explicitly drop procedure.
          try {
            conn.querySync(dropProc);
          } catch(e) { };
        }
        conn.querySync(proc2);
        // Call SP Synchronously.
        result = conn.querySync(query, [1, param2]);
        console.log("Result for Sync call of proc2 ==>");
        console.log(result);
        assert.equal(result.length, 1);
        // Call SP Asynchronously.
        conn.query(query, [1, param2], function (err, result) {
            if (err) console.log(err);
            else {
              console.log("Result for Async call of proc2 ==>");
              console.log(result);
              assert.equal(result.length, 1);
            }

            // Create SP with only Result Set and no OUT or INPUT param.
            if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
              // CREATE OR REPLACE is not supported on z/OS.  Explicitly drop procedure.
              try {
                conn.querySync(dropProc);
              } catch(e) { };
            }
            conn.querySync(proc3);
            // Call SP Synchronously.
            result = conn.querySync(query, [1, 'abc']);
            console.log("Result for Sync call of proc3 ==>");
            console.log(result);
            assert.equal(result.length, 2);
            // Call SP Asynchronously.
            conn.query(query, [1, 'abc'], function (err, result) {
                if (err) console.log(err);
                else {
                  console.log("Result for Async call of proc3 ==>");
                  console.log(result);
                  assert.equal(result.length, 2);
                }

                // Do Cleanup.
                if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
                  conn.querySync("drop procedure " + schema + ".PROC2");
                } else {
                  conn.querySync("drop procedure " + schema + ".PROC2 ( INT, VARCHAR(30) )");
                }
                conn.querySync("drop table " + schema + ".mytab1");
                // Call second test
                testDate(conn);
            });
        });
    });
});

//==================== TEST 2 =============================

function testDate(conn)
{
    console.log("\n==================== TEST 2 ===========================\n");
    var proc1 = "create procedure " + schema + ".PROC4(IN v1 int, OUT v2 DATE)"+
        " dynamic result sets 1 language sql begin  declare cr1  cursor with " +
        "return for select c1, c2 from " + schema + ".mytab1; open cr1; " +
        "set v2 = CURRENT DATE; end";
    var param2 = {ParamType:"OUTPUT", DataType:"DATE", Data:"2020-08-15", Length:30};
    var query = "call " + schema + ".PROC4(?, ?)";
    var dropProc = "drop procedure " + schema + ".PROC4";

    if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
      // - When creating an SQL native procedure on z/OS, you will need to
      // have a WLM environment defined for your system if you want to run
      // the procedure in debugging mode. Adding "disable debug mode" to
      // bypass this requirement.
      proc1 = proc1.replace(" begin", " disable debug mode begin");
    }
    try {
      conn.querySync("create table " + schema + ".mytab1 (c1 int, c2 DATE)");
    } catch (e) { console.log(e); }

    conn.querySync("insert into " +schema+ ".mytab1 values (5, '2020-04-22')");

    // Create Stored Procedure
    try {
       conn.querySync(dropProc);
    } catch(e) { };
    var err = conn.querySync(proc1);
    if(err.length) { console.log(err); }

    // Call SP Synchronously.
    var result = conn.querySync(query, [1, param2]);
    console.log("Result for Sync call of proc4 ==>");
    console.log(result);
    assert.equal(result.length, 2);
    // Call SP Asynchronously.
    conn.query(query, [1, param2], function (err, result) {
        if (err) console.log(err);
        else {
          console.log("Result for Async call of proc4 ==>");
          console.log(result);
          assert.equal(result.length, 2);
        }

        // Do Cleanup.
        if (process.env.IBM_DB_SERVER_TYPE === "ZOS") {
          conn.querySync("drop procedure " + schema + ".PROC4");
        } else {
          conn.querySync("drop procedure " + schema + ".PROC4 ( INT, DATE )");
        }
        conn.querySync("drop table " + schema + ".mytab1");
        testInteger(conn);
    });
}

//==================== TEST 3  - for issue #835 =============================

function testInteger(conn)
{
    console.log("\n==================== TEST 3 ===========================\n");
    var proc1 = "CREATE PROCEDURE " + schema + ".TEST_PROC ( IN INPUT1 INTEGER, OUT OUTPUT1 INTEGER, OUT OUTPUT2 VARCHAR(500) ) " +
                "LANGUAGE SQL SPECIFIC " + schema + ".TEST_PROC NOT DETERMINISTIC MODIFIES SQL DATA BEGIN " +
                "SET OUTPUT1 = INPUT1 + 300; SET OUTPUT2 = 'Hello this a returned result'; END ;";
    var params = [454548, { ParamType: 'OUTPUT', SQLType: 'INTEGER', Data: 0 },{ ParamType: 'OUTPUT', DataType: 'VARCHAR', Data: '', Length: 500 }];
    var query = "call " + schema + ".TEST_PROC(?, ?, ?)";
    var dropProc = "drop procedure " + schema + ".TEST_PROC";

    var err = conn.querySync(proc1);
    if(err.length) { console.log(err); }

    // Call SP Synchronously.
    var result = conn.querySync(query, params);
    conn.querySync("drop procedure " + schema + ".TEST_PROC ( INT, INT, VARCHAR(500) )");
    console.log("Result for Sync call of test_proc ==>");
    console.log(result);
    assert.equal(result.length, 2);
    assert.equal(result[0], 454848);
    // Close connection in last only.
    conn.close(function (err) { console.log("done.");});
}

