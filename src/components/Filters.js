import React, {useState} from "react";
import {useDispatch} from "react-redux";



const Filters = () => {
  const dispatch = useDispatch();
  // const [attribute, setAttribute] = useState('');
  const [values, setValues] = useState([{name: 'male'}, {name: 'female'}]);

  const onSubmit = () => {
    // dispatch({ type: 'SET_FILTER', attribute, value });
  }
  const handleChange = (e) => {
    setValues();
    console.log(e.target.value);
  }

  return <>
    <div>
      {/*<label>Attribute</label>*/}
      {/*<input value={attribute} type="select" onChange={e => setAttribute(e.target.value)} />*/}

      {/*<label>Value</label>*/}
      {/*<input value={value} type="select" onChange={e => setValue(e.target.value)} />*/}

      <select id="toggleLocationName" onChange={handleChange}>
        {values.map((item, index) =>
          <option key={index} value={item.name}>{[item.name]}</option>
        )}
      </select>

      <button onClick={onSubmit}>Filter</button>
    </div>
  </>;
};

export default Filters;