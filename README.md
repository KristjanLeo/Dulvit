# For contributors:
**By submitting a pull request to this project, 
you agree to license your contribution under the MIT license 
to this project.**

# Dulvit

## 1.  Hvað er Dulvit?
Dulvit er einfaldur og þæginlegur en á sama tíma hægvirkur og umfangslítill pakki til að búa til, þjálfa og nota tauganet í Javascript.

## 2.  Hvernig virkar pakkinn?
Byrjað er á að sækja nokkra smiði úr **nn.js**, t.d. ```Model, Dense``` og ```SquareLoss```:
```javascript
const {
  Model,
  Dense,
  SquareLoss
} = NN;
```

Svo er notað þá til að gera líkan svona:

```javascript
m = new Model(4, new SquareLoss());
m.addLayer(new Dense(2, 'swish'));
m.addLayer(new Dense(1));
```

Til að þjálfa líkanið er keyrt:
```javascript
let [trainLosses,_] = m.train(xTrain, yTrain, options);
```

Þar sem ```xTrain``` og ```yTrain``` eru af gerðinni ```Matrix``` úr **gv.js** og ```options``` er hlutur sem inniheldur einhverjar stillingar.


## 3. Nánari skjölun
Nánari skjölun síðar.
