test = () => {
  try{
    try {
      throw new Error('An error occurred');

      return true;
    } catch (e) {
      console.log(e);
      return null;
    }
  } catch (e) {
    console.log(e);
  }
};

const a = test();
console.log(a);
