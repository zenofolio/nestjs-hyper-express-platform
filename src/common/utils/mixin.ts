// Type definition for a constructor that can take any number of arguments.
type Constructor<T = object> = new (...args: unknown[]) => T;
type Returner<A,B extends Constructor, Params> = new (...args: Params[]) => A & InstanceType<B>;

/**
 * Mixes properties and methods from a mixing class into a base class.
 *
 * @template T - The type of the base class instance.
 * @template Mixing - The constructor type of the mixing class.
 * @template Params - The parameter types for the base class constructor.
 *
 * @param BaseClass - The base class to extend.
 * @param MixingClass - The class whose properties and methods will be mixed in.
 * @returns A new class that combines both base and mixing functionalities.
 */
export const Mixing = <T, Mixing extends Constructor, Params>(
  BaseClass: new (...args: Params[]) => T,
  MixingClass: Mixing
): Returner<T,Mixing, Params> => {
  
  // Create a new class that extends the base class.
  // eslint-disable-next-line 
  // @ts-ignore  
  const MixedClass = class extends BaseClass {
    constructor(...args: Params[]) {
      // Call the base class constructor with the provided arguments.
      super(...args);
      // Assign properties and methods from the mixing class instance to this instance.
      Object.assign(this, new MixingClass());
    }
  };

  // Copy all properties and methods from the MixingClass prototype to the MixedClass prototype.
  for (const key of Reflect.ownKeys(MixingClass.prototype)) {
    if (key !== "constructor") {
      MixedClass.prototype[key] = MixingClass.prototype[key];
    }
  }

  // Return the new mixed class as the desired type.
  return MixedClass as Returner<T,Mixing, Params>;
};
