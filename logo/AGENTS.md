# GENERAL PYTHON CODING GUIDELINE WHICH IS VERY IMPORTANT TO FOLLOW

## General Style
* **Follow [PEP8](https://peps.python.org/pep-0008/)** for naming, whitespace, imports, and line length.  
* **Type annotate** all functions and methods.  
* Avoid using walrus operator (:=).

## Object Oriented Programming
* **Interfaces**  
  * Define pure interfaces as *abstract base classes* (ABCs).  
  * Prefix every interface with `I...` (e.g., `IDetector`).  
  * All interface methods must be `@abstractmethod`.  
  * Inheritance is allowed **only** for interfaces.
* **Concrete behaviour over composition**  
  * When you need to combine a few objects with concrete implementation, use composition instead of inheritance (as in GO language).

## Class Design
* **Static methods**  
  * Prefer `@staticmethod` over stateful `method(self, ...)` everywhere it's applicable.  
  * Reference the class by name rather than `self`: `ClassName.method()` instead of `self.method()`.
* **Private helpers**  
  * Use `__double_leading_underscore` for methods that must stay internal (we don't call them outside the class).  
  * Use `_single_leading_underscore` for private methods which have tests.
* **Attributes**  
  * Always keep data private with `__double_leading_underscore`.  
  * Provide read only access with an `@property` of the same name, but without underscores.  
  * Add a setter method when mutation is required.
* **Stateful objects**  
  * If an object can be in several (> 2) discrete states, model it with a State Machine + Enum.
* Putt all methods which are related to of classes on top (just right after init

## Typed Value Groups and Literals
* Use `Enum` for fixed sets of values like modes, types, statuses and states. (usually strings or integers)

## Scripts
* Try to minimize your code following after `__name__ == "__main__"` to avoid variables shadowing. Ideally you should put everything in an entry-point function like `main()` or whatever name you like.
* Your entrypoint function like `main()` must not contain argument parsing inside because it makes testing not convenient.
* So, ideally your script should look like, but exceptions may occur:
```python
...
def parse_args():
  pass

def main(a, b, c):
   pass

if __name__ == "__main__":
    args = parse_args()
    main(a=args.a, b=args.b, c=args.c)

```

## Constants
* Put global constants to `const.py`
* If constants are related to the same topic group them by `@dataclass` (see examples in `const.py`)

## Tests
* Don't use unit tests, use pytest instead
* Respect encapsulation: test expected behaviour, not internal implementation, that may easily change.  
* Use `@pytest.mark.parametrize` and `fixtures` where appropriate.  
* Aim for a low level of mocking; the fewer mocks, the better. Usually you can avoid mocking by refactoring the functionality which need to be tested into tested functionality + the rest, so you can import the first one and don't mock the rest.
* You must run test via make commands. If there are no suitable make command, and you expect it to be used again, create that command.)

## Defaults
* Avoid using defaults, except for cases where we don't expect to change the value at all 
* The defaults should be moved to config or arg parser
* Try to avoid optional arguments, especially with default None value
* Avoid using hidden defaults: cfg.get(param) is always more preferable than cfg.get(param, None) or cfg.get(param)

## Misc
* Always use `pathlib` over `os.path`
* don't use try-except block unless it directly said, instead, let program fail naturally, always assume all files are presented and so on, no need to wrap everything into try-except
* don't use if-else block to raise errors, for example, don't use logic like "if there is no file I raise an error", let file opener raise an error by itself
* write as few comments as possible, instead, use self-explanatory variable and methods naming

# PROJECT SPECIFIC GUIDELINE
* don't run e2e tests until you explicitly asked user permission
* don't try to support backward compatability because I'm the only user of the project, instead, prefer clean code with extra logic for supporting previous developments
* Don't use Optional arguments in order to avoid changing tests or to support backward compatability. It's better to update tests and don't care at all about compatability.
* if you need some command which is expected to be run over and over again, move it to Makefile
