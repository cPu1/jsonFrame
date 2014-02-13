module.exports = {
	what: function() { return 'nothing'; },
	findVowels: function (arr) {
		vowels = ['a', 'e', 'i', 'o', 'u'];
		return arr.filter(function (c) {
			return ~vowels.indexOf(c);
		});
	},
	add: function () {
    		return Array.prototype.slice.call(arguments).reduce(function (sum, i) {
      			return sum + i;
    		});
  	},
	addProperties: function () {
		var o = {};
		g = Array.prototype.slice.call(arguments, 0).forEach(function (p, i) {
			o[p] = i;
		});
		return o;
	},
	create: function (user) {
		return {username: user.name.toUpperCase(), age: user.age * 2}
	}
}
