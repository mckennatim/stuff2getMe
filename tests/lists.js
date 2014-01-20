var assert = require('assert');

suite('Lists', function() {
  test('in the server', function(done, server) {
    server.eval(function() {
      Lists.insert({"id": 4,"repo": "Froggo","list": "groceries","stuff": "Granny smith apple","need": 0});
      var docs = Lists.find().fetch();
      emit('docs', docs);
      console.log(docs);
    });

    server.once('docs', function(docs) {
      assert.equal(docs.length, 1);
      done();
    });
  });
});

