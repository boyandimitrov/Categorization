
module.exports = {
    intersect : (array1, array2) => {
        return array1.filter(element => array2.includes(element));
    },
    sample_size : (array, n) => {
        n = n == null ? 1 : n
        const length = array == null ? 0 : array.length
        if (!length || n < 1) {
          return []
        }
        n = n > length ? length : n
        let index = -1
        const lastIndex = length - 1
        const result = [...array];
        while (++index < n) {
          const rand = index + Math.floor(Math.random() * (lastIndex - index + 1))
          const value = result[rand]
          result[rand] = result[index]
          result[index] = value
        }
        return {training_set : result.slice(0, n), categorization_set : result.slice(-(result.length-n))};
    }
}

